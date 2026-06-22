import assert from "node:assert/strict";
import test from "node:test";
import { runtimePrivilegeManifest } from "../src/db/runtimePrivilegeManifest.js";
import { verifyRuntimePrivileges } from "../src/db/runtimePrivilegeVerifier.js";
import { assertRuntimeVerificationAllowed } from "../src/scripts/verifyStagingRuntimePrivileges.js";

const unsafeOutputPattern =
  /DATABASE_URL|postgres:\/\/|postgresql:\/\/|password|private_key|BEGIN PRIVATE KEY|auth_uid|email/i;
const forbiddenMutationPattern =
  /^\s*(insert|update|delete|alter|create|drop|truncate|grant|revoke|comment)\b/i;
const allPrivileges = ["SELECT", "INSERT", "UPDATE", "DELETE"];

function createFakePool(overrides = {}) {
  const calls = [];
  let released = false;
  const state = {
    readOnly: "on",
    runtimeRoleMember: true,
    cloudSqlSuperuserMember: false,
    superuser: false,
    createRole: false,
    createDb: false,
    replication: false,
    applicationTableCount: 0,
    sequenceCount: 0,
    functionCount: 0,
    databaseCreate: false,
    schemaCreate: false,
    adminOptionMembershipCount: 0,
    throwOn: null,
    ...overrides
  };

  const client = {
    async query(sql, params) {
      const normalizedSql = typeof sql === "string" ? sql.trim().replace(/\s+/g, " ") : "";
      calls.push({ sql: normalizedSql, params });
      if (state.throwOn && new RegExp(state.throwOn, "i").test(normalizedSql)) {
        throw new Error("synthetic verifier failure");
      }
      if (normalizedSql === "begin transaction read only") return { rows: [] };
      if (normalizedSql === "set local search_path = pg_catalog, public") return { rows: [] };
      if (normalizedSql === "commit" || normalizedSql === "rollback") return { rows: [] };
      if (/current_setting\('transaction_read_only'\)/i.test(normalizedSql)) {
        return { rows: [{ read_only: state.readOnly }] };
      }
      if (/pg_has_role\(current_user, \$1, 'member'\)/i.test(normalizedSql)) {
        return {
          rows: [
            {
              runtime_role_member: state.runtimeRoleMember,
              cloudsql_superuser_member: state.cloudSqlSuperuserMember,
              rolsuper: state.superuser,
              rolcreatedb: state.createDb,
              rolcreaterole: state.createRole,
              rolreplication: state.replication
            }
          ]
        };
      }
      if (/application_table_count/i.test(normalizedSql)) {
        return {
          rows: [
            {
              application_table_count: state.applicationTableCount,
              sequence_count: state.sequenceCount,
              function_count: state.functionCount
            }
          ]
        };
      }
      if (/has_database_privilege/i.test(normalizedSql)) {
        return { rows: [{ connect: true, create: state.databaseCreate }] };
      }
      if (/has_schema_privilege/i.test(normalizedSql)) {
        return { rows: [{ usage: true, create: state.schemaCreate }] };
      }
      if (/has_table_privilege/i.test(normalizedSql)) {
        const [, tableName] = String(params?.[0] || "").split(".");
        const privilege = params?.[1];
        const expected = new Set(runtimePrivilegeManifest[tableName] || []);
        return { rows: [{ allowed: expected.has(privilege) }] };
      }
      if (/admin_option_membership_count/i.test(normalizedSql)) {
        return {
          rows: [{ admin_option_membership_count: state.adminOptionMembershipCount }]
        };
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

test("verification script guard requires the explicit staging allow flag", () => {
  assert.throws(() => assertRuntimeVerificationAllowed({}), /disabled/);
  assert.doesNotThrow(() =>
    assertRuntimeVerificationAllowed({
      ALLOW_STAGING_RUNTIME_PRIVILEGE_VERIFICATION: "true"
    })
  );
});

test("runtime verifier succeeds with read-only transaction and aggregate result", async () => {
  const pool = createFakePool();
  const result = await verifyRuntimePrivileges({ pool });

  assert.equal(result.ok, true);
  assert.equal(result.readOnlyTransaction, true);
  assert.equal(result.identity.runtimeRoleMember, true);
  assert.equal(result.identity.cloudSqlSuperuserMember, false);
  assert.equal(result.ownership.applicationTableCount, 0);
  assert.equal(result.database.create, false);
  assert.equal(result.schema.create, false);
  assert.equal(result.expectedPrivilegeMissingCount, 0);
  assert.equal(result.unexpectedPrivilegeCount, 0);
  assert.equal(result.migrationLedgerAccess, false);
  assert.deepEqual(result.failedChecks, []);
  assert.equal(pool.calls[0].sql, "begin transaction read only");
  assert.equal(pool.calls.at(-1).sql, "commit");
  assert.equal(pool.released, true);
  assert.doesNotMatch(JSON.stringify(result), unsafeOutputPattern);
});

test("runtime verifier SQL is read-only and avoids mutation statements", async () => {
  const pool = createFakePool();
  await verifyRuntimePrivileges({ pool });

  for (const call of pool.calls) {
    assert.doesNotMatch(call.sql, forbiddenMutationPattern);
  }
});

test("runtime verifier checks each manifest table privilege explicitly", async () => {
  const pool = createFakePool();
  await verifyRuntimePrivileges({ pool });

  const tablePrivilegeCalls = pool.calls.filter((call) => /has_table_privilege/i.test(call.sql));
  const expectedCount = (Object.keys(runtimePrivilegeManifest).length + 1) * allPrivileges.length;
  assert.equal(tablePrivilegeCalls.length, expectedCount);
});

test("runtime verifier fails when runtime user lacks group role membership", async () => {
  const result = await verifyRuntimePrivileges({
    pool: createFakePool({ runtimeRoleMember: false })
  });

  assert.equal(result.ok, false);
  assert.ok(result.failedChecks.includes("identity.runtimeRoleMember"));
});

test("runtime verifier fails on elevated role attributes", async () => {
  const result = await verifyRuntimePrivileges({
    pool: createFakePool({ createRole: true, createDb: true, replication: true })
  });

  assert.equal(result.ok, false);
  assert.ok(result.failedChecks.includes("identity.createRole"));
  assert.ok(result.failedChecks.includes("identity.createDb"));
  assert.ok(result.failedChecks.includes("identity.replication"));
});

test("runtime verifier fails on ownership and schema/database create", async () => {
  const result = await verifyRuntimePrivileges({
    pool: createFakePool({
      applicationTableCount: 1,
      sequenceCount: 1,
      functionCount: 1,
      databaseCreate: true,
      schemaCreate: true
    })
  });

  assert.equal(result.ok, false);
  assert.ok(result.failedChecks.includes("ownership.applicationTableCount"));
  assert.ok(result.failedChecks.includes("ownership.sequenceCount"));
  assert.ok(result.failedChecks.includes("ownership.functionCount"));
  assert.ok(result.failedChecks.includes("database.create"));
  assert.ok(result.failedChecks.includes("schema.create"));
});

test("runtime verifier rolls back on failure and sanitizes leaking errors", async () => {
  const pool = createFakePool({ throwOn: "pg_has_role" });
  await assert.rejects(() => verifyRuntimePrivileges({ pool }), /synthetic verifier failure/);
  assert.equal(pool.calls.at(-1).sql, "rollback");
  assert.equal(pool.released, true);

  const leakingPool = createFakePool();
  const client = await leakingPool.connect();
  client.query = async () => {
    throw new Error("DATABASE_URL contained unsafe value");
  };
  await assert.rejects(
    () => verifyRuntimePrivileges({ pool: leakingPool }),
    /Runtime privilege verification failed/
  );
});
