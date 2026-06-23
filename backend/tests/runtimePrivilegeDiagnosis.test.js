import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyRuntimePrivilegeFailure,
  diagnoseRuntimePrivilegeState
} from "../src/db/runtimePrivilegeDiagnosis.js";
import {
  getRuntimePrivilegeEntries,
  runtimePrivilegeManifest
} from "../src/db/runtimePrivilegeManifest.js";
import { assertRuntimeDiagnosisAllowed } from "../src/scripts/diagnoseStagingRuntimePrivileges.js";

const forbiddenMutationPattern =
  /^\s*(insert|update|delete|alter|create|drop|truncate|grant|revoke|comment)\b/i;
const unsafeOutputPattern =
  /DATABASE_URL|postgres:\/\/|postgresql:\/\/|password|private_key|BEGIN PRIVATE KEY|auth_uid|email|aclitem|owner_oid|role_oid/i;
const tablePrivileges = ["SELECT", "INSERT", "UPDATE", "DELETE"];

function createFakePool(overrides = {}) {
  const calls = [];
  let released = false;
  const state = {
    readOnly: "on",
    currentCreateRole: true,
    currentDatabaseOwner: true,
    currentSchemaOwner: true,
    currentPgDatabaseOwnerMember: true,
    runtimeRoleExists: true,
    runtimeRoleAttrsExpected: true,
    runtimeRoleCloudSqlSuperuser: false,
    ownedTableCount: 0,
    ownedSequenceCount: 0,
    ownedFunctionCount: 0,
    databaseCreateEffective: false,
    schemaCreateEffective: false,
    databasePublicCreate: false,
    schemaPublicCreate: false,
    missingTable: null,
    unexpectedPrivilege: null,
    missingPrivilege: null,
    migrationLedgerAccess: false,
    throwOn: null,
    ...overrides
  };

  const existingTables = new Set(getRuntimePrivilegeEntries().map(({ tableName }) => tableName));
  if (state.missingTable) existingTables.delete(state.missingTable);

  const client = {
    async query(sql, params) {
      const normalizedSql = typeof sql === "string" ? sql.trim().replace(/\s+/g, " ") : "";
      calls.push({ sql: normalizedSql, params });
      if (state.throwOn && new RegExp(state.throwOn, "i").test(normalizedSql)) {
        throw new Error("synthetic diagnosis failure");
      }
      if (normalizedSql === "begin transaction read only") return { rows: [] };
      if (normalizedSql === "set local search_path = pg_catalog, public") return { rows: [] };
      if (normalizedSql === "commit" || normalizedSql === "rollback") return { rows: [] };
      if (/current_setting\('transaction_read_only'\)/i.test(normalizedSql)) {
        return { rows: [{ read_only: state.readOnly }] };
      }
      if (/from pg_roles r where r\.rolname = current_user/i.test(normalizedSql)) {
        return {
          rows: [
            {
              login: true,
              create_role: state.currentCreateRole,
              create_db: false,
              superuser: false,
              replication: false,
              cloudsql_superuser_member: false,
              database_owner: state.currentDatabaseOwner,
              public_schema_owner: state.currentSchemaOwner,
              pg_database_owner_member: state.currentPgDatabaseOwnerMember
            }
          ]
        };
      }
      if (/from pg_roles r where r\.rolname = \$1/i.test(normalizedSql)) {
        if (!state.runtimeRoleExists) return { rows: [] };
        return {
          rows: [
            {
              rolcanlogin: !state.runtimeRoleAttrsExpected,
              rolsuper: false,
              rolcreatedb: false,
              rolcreaterole: false,
              rolreplication: false,
              rolinherit: state.runtimeRoleAttrsExpected,
              cloudsql_superuser_member: state.runtimeRoleCloudSqlSuperuser,
              owned_table_count: state.ownedTableCount,
              owned_sequence_count: state.ownedSequenceCount,
              owned_function_count: state.ownedFunctionCount
            }
          ]
        };
      }
      if (/has_database_privilege/i.test(normalizedSql)) {
        return {
          rows: [
            {
              connect_effective: state.runtimeRoleExists,
              create_effective: state.databaseCreateEffective,
              temporary_effective: false,
              public_create: state.databasePublicCreate,
              public_connect: true,
              current_user_is_owner: state.currentDatabaseOwner
            }
          ]
        };
      }
      if (/has_schema_privilege/i.test(normalizedSql)) {
        return {
          rows: [
            {
              usage_effective: state.runtimeRoleExists,
              create_effective: state.schemaCreateEffective,
              public_usage: true,
              public_create: state.schemaPublicCreate,
              current_user_is_owner: state.currentSchemaOwner
            }
          ]
        };
      }
      if (/from information_schema\.tables/i.test(normalizedSql)) {
        return { rows: [...existingTables].map((table_name) => ({ table_name })) };
      }
      if (/from information_schema\.table_privileges/i.test(normalizedSql)) {
        const rows = [];
        if (state.unexpectedPrivilege) {
          const [table_name, privilege_type] = state.unexpectedPrivilege.split(".");
          rows.push({ table_name, privilege_type });
        }
        return { rows };
      }
      if (/has_table_privilege/i.test(normalizedSql)) {
        const [, tableName] = String(params?.[1] || "").split(".");
        const privilege = params?.[2];
        if (tableName === "app_schema_migrations") {
          return { rows: [{ allowed: state.migrationLedgerAccess }] };
        }
        const expected = new Set(runtimePrivilegeManifest[tableName] || []);
        let allowed = state.runtimeRoleExists && expected.has(privilege);
        if (state.missingPrivilege === `${tableName}.${privilege}`) allowed = false;
        if (state.unexpectedPrivilege === `${tableName}.${privilege}`) allowed = true;
        return { rows: [{ allowed }] };
      }
      throw new Error(`Unexpected query: ${normalizedSql}`);
    },
    release() {
      released = true;
    }
  };

  return {
    calls,
    get released() {
      return released;
    },
    async connect() {
      return client;
    }
  };
}

test("diagnosis script guard requires explicit allow flag", () => {
  assert.throws(() => assertRuntimeDiagnosisAllowed({}), /disabled/);
  assert.doesNotThrow(() =>
    assertRuntimeDiagnosisAllowed({ ALLOW_STAGING_RUNTIME_PRIVILEGE_DIAGNOSIS: "true" })
  );
});

test("diagnosis uses read-only transaction, commits success, and returns sanitized aggregate state", async () => {
  const pool = createFakePool();
  const result = await diagnoseRuntimePrivilegeState({ pool });

  assert.equal(result.diagnosticCompleted, true);
  assert.equal(result.readOnlyTransaction, true);
  assert.equal(result.dbMutation, false);
  assert.equal(result.runtimeRole.exists, true);
  assert.equal(result.runtimeRole.attributesExpected, true);
  assert.equal(result.tables.expectedPrivilegeMissingCount, 0);
  assert.equal(result.tables.unexpectedPrivilegeCount, 0);
  assert.equal(result.tables.migrationLedgerAccess, false);
  assert.equal(result.classification.category, "F");
  assert.equal(pool.calls[0].sql, "begin transaction read only");
  assert.equal(pool.calls.at(-1).sql, "commit");
  assert.equal(pool.released, true);
  assert.doesNotMatch(JSON.stringify(result), unsafeOutputPattern);
});

test("diagnosis SQL contains no mutation statements", async () => {
  const pool = createFakePool();
  await diagnoseRuntimePrivilegeState({ pool });

  for (const call of pool.calls) {
    assert.doesNotMatch(call.sql, forbiddenMutationPattern);
  }
});

test("diagnosis rolls back on failure and sanitizes leaking errors", async () => {
  const pool = createFakePool({ throwOn: "information_schema\\.tables" });
  await assert.rejects(() => diagnoseRuntimePrivilegeState({ pool }), /synthetic diagnosis failure/);
  assert.equal(pool.calls.at(-1).sql, "rollback");
  assert.equal(pool.released, true);

  const leakingPool = createFakePool();
  const client = await leakingPool.connect();
  client.query = async () => {
    throw new Error("DATABASE_URL contained unsafe value");
  };
  await assert.rejects(
    () => diagnoseRuntimePrivilegeState({ pool: leakingPool }),
    /Runtime privilege diagnosis failed/
  );
});

test("diagnosis reports absent runtime role as rolled back or not started", async () => {
  const result = await diagnoseRuntimePrivilegeState({
    pool: createFakePool({ runtimeRoleExists: false, currentCreateRole: false })
  });

  assert.equal(result.runtimeRole.exists, false);
  assert.equal(result.classification.category, "C");
  assert.equal(result.classification.state, "ROLLED_BACK_OR_NOT_STARTED");
});

test("diagnosis detects PUBLIC schema CREATE and classifies committed validation failure", async () => {
  const result = await diagnoseRuntimePrivilegeState({
    pool: createFakePool({ schemaPublicCreate: true, schemaCreateEffective: true })
  });

  assert.equal(result.schema.publicCreate, true);
  assert.equal(result.schema.createEffective, true);
  assert.equal(result.classification.category, "A");
});

test("diagnosis detects database ownership gaps", async () => {
  const result = await diagnoseRuntimePrivilegeState({
    pool: createFakePool({
      runtimeRoleExists: false,
      currentCreateRole: true,
      currentDatabaseOwner: false
    })
  });

  assert.equal(result.currentSession.databaseOwner, false);
  assert.equal(result.classification.category, "B");
});

test("diagnosis detects missing manifest table", async () => {
  const result = await diagnoseRuntimePrivilegeState({
    pool: createFakePool({ missingTable: "products" })
  });

  assert.deepEqual(result.tables.missingTableNames, ["products"]);
  assert.equal(result.classification.category, "D");
});

test("diagnosis counts expected missing, unexpected privileges, and migration ledger access", async () => {
  const result = await diagnoseRuntimePrivilegeState({
    pool: createFakePool({
      missingPrivilege: "users.SELECT",
      unexpectedPrivilege: "collections.UPDATE",
      migrationLedgerAccess: true
    })
  });

  assert.equal(result.tables.expectedPrivilegeMissingCount, 1);
  assert.equal(result.tables.unexpectedPrivilegeCount, 1);
  assert.deepEqual(result.tables.tablesWithMissingPrivileges, ["users"]);
  assert.deepEqual(result.tables.tablesWithUnexpectedPrivileges, ["collections"]);
  assert.equal(result.tables.migrationLedgerAccess, true);
});

test("classification helper covers connection/config and unknown states", () => {
  assert.equal(
    classifyRuntimePrivilegeFailure({ diagnosticCompleted: false }).category,
    "E"
  );
  assert.equal(classifyRuntimePrivilegeFailure({ diagnosticCompleted: true }).category, "F");
});

test("diagnosis checks each manifest table and migration ledger privilege", async () => {
  const pool = createFakePool();
  await diagnoseRuntimePrivilegeState({ pool });

  const tableChecks = pool.calls.filter((call) => /has_table_privilege/i.test(call.sql));
  assert.equal(
    tableChecks.length,
    (getRuntimePrivilegeEntries().length + 1) * tablePrivileges.length
  );
});
