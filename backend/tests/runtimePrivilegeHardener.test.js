import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  detectDeleteTablesFromQuerySource,
  extractReferencedTablesFromQuerySource,
  getRuntimeQuerySourceModules,
  runtimePrivilegeManifest,
  validateRuntimePrivilegeManifest
} from "../src/db/runtimePrivilegeManifest.js";
import {
  buildRuntimeHardeningPlan,
  hardenRuntimePrivileges
} from "../src/db/runtimePrivilegeHardener.js";
import { assertRuntimeHardeningAllowed } from "../src/scripts/applyStagingRuntimePrivileges.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(currentDir, "..");
const queryDir = path.join(backendRoot, "src", "db", "queries");
const forbiddenBroadPrivilegePattern = /\b(ALL\s+PRIVILEGES|ALL\s+TABLES)\b/i;
const unsafeOutputPattern =
  /DATABASE_URL|postgres:\/\/|postgresql:\/\/|password|private_key|BEGIN PRIVATE KEY|auth_uid|email|aclitem|owner_oid|role_oid/i;

function createFakePool(overrides = {}) {
  const calls = [];
  let released = false;
  const state = {
    roleExists: false,
    unsafeExistingRole: false,
    currentCanCreateRole: true,
    currentCanCreateDb: true,
    currentSuperuser: false,
    currentCloudSqlSuperuser: true,
    databaseOwner: false,
    schemaOwner: false,
    databasePublicConnect: true,
    databasePublicCreate: false,
    schemaPublicUsage: true,
    schemaPublicCreate: false,
    tableOwner: true,
    tableGrantAuthority: true,
    missingTables: new Set(),
    publicTableOvergrantTables: new Set(),
    missingRuntimePrivileges: new Set(),
    unexpectedRuntimePrivileges: new Set(),
    migrationLedgerAccess: false,
    throwOn: null,
    ...overrides
  };
  state.missingTables = new Set(state.missingTables);
  state.publicTableOvergrantTables = new Set(state.publicTableOvergrantTables);
  state.missingRuntimePrivileges = new Set(state.missingRuntimePrivileges);
  state.unexpectedRuntimePrivileges = new Set(state.unexpectedRuntimePrivileges);

  function tableNameFromRef(ref) {
    const [, tableName] = String(ref || "").split(".");
    return tableName;
  }

  function expectedAllows(tableName, privilege) {
    const expected = new Set(runtimePrivilegeManifest[tableName] || []);
    const key = `${tableName}.${privilege}`;
    if (state.missingRuntimePrivileges.has(key)) return false;
    if (state.unexpectedRuntimePrivileges.has(key)) return true;
    return expected.has(privilege);
  }

  const client = {
    async query(sql, params) {
      const normalizedSql = typeof sql === "string" ? sql.trim().replace(/\s+/g, " ") : "";
      calls.push({ sql: normalizedSql, params });
      if (state.throwOn && new RegExp(state.throwOn, "i").test(normalizedSql)) {
        throw new Error("synthetic hardening failure");
      }
      if (normalizedSql === "begin" || normalizedSql === "commit" || normalizedSql === "rollback") {
        return { rows: [] };
      }
      if (/^set local search_path/i.test(normalizedSql)) return { rows: [] };
      if (/from pg_roles r where r\.rolname = current_user/i.test(normalizedSql)) {
        return {
          rows: [
            {
              create_role: state.currentCanCreateRole,
              create_db: state.currentCanCreateDb,
              superuser: state.currentSuperuser,
              cloudsql_superuser_member: state.currentCloudSqlSuperuser,
              database_owner: state.databaseOwner,
              schema_owner: state.schemaOwner
            }
          ]
        };
      }
      if (/from pg_database d left join lateral aclexplode/i.test(normalizedSql)) {
        return {
          rows: [
            {
              public_connect: state.databasePublicConnect,
              public_create: state.databasePublicCreate
            }
          ]
        };
      }
      if (/from pg_namespace n left join lateral aclexplode/i.test(normalizedSql)) {
        return {
          rows: [
            {
              public_usage: state.schemaPublicUsage,
              public_create: state.schemaPublicCreate
            }
          ]
        };
      }
      if (/to_regclass\(\$1\) is not null/i.test(normalizedSql)) {
        const tableName = params?.[2];
        const missing = state.missingTables.has(tableName);
        const grants = state.tableGrantAuthority;
        return {
          rows: [
            {
              exists: !missing,
              current_user_is_owner: state.tableOwner,
              select_grant_option: grants,
              insert_grant_option: grants,
              update_grant_option: grants,
              delete_grant_option: grants,
              public_overgrant_count: state.publicTableOvergrantTables.has(tableName) ? 1 : 0
            }
          ]
        };
      }
      if (/from pg_roles where rolname/i.test(normalizedSql)) {
        if (!state.roleExists) return { rows: [] };
        return {
          rows: [
            {
              rolcanlogin: state.unsafeExistingRole,
              rolsuper: false,
              rolcreatedb: false,
              rolcreaterole: false,
              rolreplication: false,
              rolinherit: true
            }
          ]
        };
      }
      if (/^create role "noblesse_staging_runtime_role"/i.test(normalizedSql)) {
        state.roleExists = true;
        return { rows: [] };
      }
      if (/^alter role "noblesse_staging_runtime_role" set search_path/i.test(normalizedSql)) {
        return { rows: [] };
      }
      if (/^(grant|revoke)\b/i.test(normalizedSql)) return { rows: [] };
      if (/has_database_privilege/i.test(normalizedSql)) {
        return { rows: [{ connect: true, create: false }] };
      }
      if (/has_schema_privilege/i.test(normalizedSql)) {
        return { rows: [{ usage: true, create: false }] };
      }
      if (/has_table_privilege/i.test(normalizedSql)) {
        const tableName = tableNameFromRef(params?.[1]);
        const privilege = params?.[2];
        if (tableName === "app_schema_migrations") {
          return { rows: [{ allowed: state.migrationLedgerAccess }] };
        }
        return { rows: [{ allowed: expectedAllows(tableName, privilege) }] };
      }
      throw new Error(`Unexpected query: ${normalizedSql}`);
    },
    release() {
      released = true;
    }
  };

  return {
    calls,
    state,
    get released() {
      return released;
    },
    async connect() {
      return client;
    }
  };
}

test("hardening script guard requires the explicit staging allow flag", () => {
  assert.throws(() => assertRuntimeHardeningAllowed({}), /disabled/);
  assert.doesNotThrow(() =>
    assertRuntimeHardeningAllowed({ ALLOW_STAGING_RUNTIME_PRIVILEGE_HARDENING: "true" })
  );
});

test("runtime privilege manifest excludes migration ledger and broad privileges", () => {
  const validation = validateRuntimePrivilegeManifest();
  assert.equal(validation.ok, true);
  assert.equal(Object.hasOwn(runtimePrivilegeManifest, "app_schema_migrations"), false);
  const serialized = JSON.stringify(runtimePrivilegeManifest);
  assert.doesNotMatch(serialized, forbiddenBroadPrivilegePattern);
});

test("query source tables are covered by the runtime privilege manifest", async () => {
  const referenced = new Set();
  for (const moduleName of getRuntimeQuerySourceModules()) {
    const source = await fs.readFile(path.join(queryDir, moduleName), "utf8");
    for (const tableName of extractReferencedTablesFromQuerySource(source)) {
      referenced.add(tableName);
    }
  }

  for (const tableName of referenced) {
    assert.equal(
      Object.hasOwn(runtimePrivilegeManifest, tableName),
      true,
      `missing manifest table: ${tableName}`
    );
  }
});

test("DELETE grants are present only when query source uses DELETE", async () => {
  const deleteTables = new Set();
  for (const moduleName of getRuntimeQuerySourceModules()) {
    const source = await fs.readFile(path.join(queryDir, moduleName), "utf8");
    for (const tableName of detectDeleteTablesFromQuerySource(source)) {
      deleteTables.add(tableName);
    }
  }

  for (const [tableName, privileges] of Object.entries(runtimePrivilegeManifest)) {
    if (privileges.includes("DELETE")) {
      assert.equal(deleteTables.has(tableName), true, `DELETE overgrant: ${tableName}`);
    }
  }
});

test("hardener accepts safe PUBLIC database and schema state without ACL mutation", async () => {
  const pool = createFakePool({
    databaseOwner: false,
    schemaOwner: false,
    databasePublicConnect: true,
    databasePublicCreate: false,
    schemaPublicUsage: true,
    schemaPublicCreate: false
  });
  const result = await hardenRuntimePrivileges({ pool });

  assert.equal(result.ok, true);
  assert.equal(result.databaseAclMutationExecuted, false);
  assert.equal(result.schemaAclMutationExecuted, false);
  assert.equal(result.publicPrivilegeUsed, true);
  assert.equal(pool.calls.some((call) => /^grant connect on database/i.test(call.sql)), false);
  assert.equal(pool.calls.some((call) => /^grant usage on schema/i.test(call.sql)), false);
  assert.equal(pool.calls.some((call) => /^revoke create on (database|schema)/i.test(call.sql)), false);
});

test("hardener creates fixed runtime role, grants manifest privileges, and commits", async () => {
  const pool = createFakePool();
  const result = await hardenRuntimePrivileges({ pool });

  assert.equal(result.ok, true);
  assert.equal(result.role.canLogin, false);
  assert.equal(result.role.createRole, false);
  assert.equal(result.database.create, false);
  assert.equal(result.schema.create, false);
  assert.equal(result.expectedPrivilegeMissingCount, 0);
  assert.equal(result.unexpectedPrivilegeCount, 0);
  assert.equal(result.migrationLedgerAccess, false);
  assert.equal(result.transactionCommitted, true);
  assert.equal(pool.calls[0].sql, "begin");
  assert.equal(pool.calls.at(-1).sql, "commit");
  assert.equal(pool.released, true);
  assert.ok(
    pool.calls.some((call) =>
      /^create role "noblesse_staging_runtime_role" nologin nosuperuser nocreatedb nocreaterole noreplication inherit$/i.test(
        call.sql
      )
    )
  );
  assert.ok(
    pool.calls.some((call) =>
      /^alter role "noblesse_staging_runtime_role" set search_path = pg_catalog, public$/i.test(
        call.sql
      )
    )
  );
});

test("hardener SQL avoids broad privileges, PUBLIC ACL mutation, and owner changes", async () => {
  const pool = createFakePool();
  await hardenRuntimePrivileges({ pool });

  for (const call of pool.calls) {
    assert.doesNotMatch(call.sql, forbiddenBroadPrivilegePattern);
    assert.doesNotMatch(call.sql, /\b(revoke|grant)\b.*\b(to|from)\s+public\b/i);
    assert.doesNotMatch(call.sql, /\balter\s+(database|schema)\b.*\bowner\b/i);
    assert.doesNotMatch(call.sql, /^grant create on (schema|database)/i);
  }
});

test("existing role convergence revokes migration ledger access without granting it", async () => {
  const pool = createFakePool({ roleExists: true });
  await hardenRuntimePrivileges({ pool });

  assert.ok(
    pool.calls.some((call) =>
      /^revoke SELECT, INSERT, UPDATE, DELETE on "public"\."app_schema_migrations"/i.test(
        call.sql
      )
    )
  );
  assert.equal(
    pool.calls.some((call) => /^grant\b/i.test(call.sql) && /app_schema_migrations/i.test(call.sql)),
    false
  );
});

test("hardener fails before role creation when CREATEROLE is missing", async () => {
  const pool = createFakePool({ currentCanCreateRole: false });
  await assert.rejects(() => hardenRuntimePrivileges({ pool }), /authority preflight/);

  assert.equal(pool.calls.some((call) => /^create role/i.test(call.sql)), false);
  assert.equal(pool.calls.at(-1).sql, "rollback");
});

test("hardener fails before role creation when safe database state requires unavailable owner authority", async () => {
  const pool = createFakePool({ databasePublicConnect: false, databaseOwner: false });
  await assert.rejects(() => hardenRuntimePrivileges({ pool }), /authority preflight/);

  assert.equal(pool.calls.some((call) => /^create role/i.test(call.sql)), false);
  assert.equal(pool.calls.at(-1).sql, "rollback");
});

test("hardener fails before role creation when safe schema state requires unavailable owner authority", async () => {
  const pool = createFakePool({ schemaPublicUsage: false, schemaOwner: false });
  await assert.rejects(() => hardenRuntimePrivileges({ pool }), /authority preflight/);

  assert.equal(pool.calls.some((call) => /^create role/i.test(call.sql)), false);
  assert.equal(pool.calls.at(-1).sql, "rollback");
});

test("hardener fails before role creation for missing manifest tables", async () => {
  const pool = createFakePool({ missingTables: ["products"] });
  await assert.rejects(() => hardenRuntimePrivileges({ pool }), /authority preflight/);

  assert.equal(pool.calls.some((call) => /^create role/i.test(call.sql)), false);
  assert.equal(pool.calls.at(-1).sql, "rollback");
});

test("hardener fails before role creation when table grant authority is missing", async () => {
  const pool = createFakePool({ tableOwner: false, tableGrantAuthority: false });
  await assert.rejects(() => hardenRuntimePrivileges({ pool }), /authority preflight/);

  assert.equal(pool.calls.some((call) => /^create role/i.test(call.sql)), false);
  assert.equal(pool.calls.at(-1).sql, "rollback");
});

test("hardener fails before role creation for PUBLIC table overgrant", async () => {
  const pool = createFakePool({ publicTableOvergrantTables: ["products"] });
  await assert.rejects(() => hardenRuntimePrivileges({ pool }), /authority preflight/);

  assert.equal(pool.calls.some((call) => /^create role/i.test(call.sql)), false);
  assert.equal(pool.calls.at(-1).sql, "rollback");
});

test("hardener rolls back when post-mutation verification finds missing expected privileges", async () => {
  const pool = createFakePool({ missingRuntimePrivileges: ["products.SELECT"] });
  await assert.rejects(() => hardenRuntimePrivileges({ pool }), /verification failed/);

  assert.equal(pool.calls.some((call) => /^create role/i.test(call.sql)), true);
  assert.equal(pool.calls.at(-1).sql, "rollback");
  assert.equal(pool.calls.some((call) => call.sql === "commit"), false);
});

test("hardener rolls back when post-mutation verification finds unexpected privileges", async () => {
  const pool = createFakePool({ unexpectedRuntimePrivileges: ["products.DELETE"] });
  await assert.rejects(() => hardenRuntimePrivileges({ pool }), /verification failed/);

  assert.equal(pool.calls.at(-1).sql, "rollback");
  assert.equal(pool.calls.some((call) => call.sql === "commit"), false);
});

test("hardener rolls back when migration ledger access is detected", async () => {
  const pool = createFakePool({ migrationLedgerAccess: true });
  await assert.rejects(() => hardenRuntimePrivileges({ pool }), /verification failed/);

  assert.equal(pool.calls.at(-1).sql, "rollback");
  assert.equal(pool.calls.some((call) => call.sql === "commit"), false);
});

test("hardener rolls back on SQL failure and releases the client", async () => {
  const pool = createFakePool({ throwOn: "grant SELECT" });
  await assert.rejects(() => hardenRuntimePrivileges({ pool }), /synthetic hardening failure/);

  assert.equal(pool.calls.at(-1).sql, "rollback");
  assert.equal(pool.released, true);
});

test("hardener refuses an existing role with unsafe attributes", async () => {
  const pool = createFakePool({ roleExists: true, unsafeExistingRole: true });
  await assert.rejects(() => hardenRuntimePrivileges({ pool }), /unsafe attributes/);
  assert.equal(pool.calls.at(-1).sql, "rollback");
});

test("buildRuntimeHardeningPlan summarizes safe and unsafe authority state", () => {
  const safe = buildRuntimeHardeningPlan({
    currentSession: { canCreateRole: true },
    database: { stateAlreadySafe: true, publicConnect: true, publicCreate: false, mutationAuthority: false },
    schema: { stateAlreadySafe: true, publicUsage: true, publicCreate: false, mutationAuthority: false },
    tables: [
      {
        tableName: "products",
        exists: true,
        currentUserIsOwner: true,
        expectedPrivileges: ["SELECT"],
        grantOptions: { SELECT: false },
        publicOvergrantCount: 0
      }
    ]
  });
  assert.equal(safe.ok, true);
  assert.equal(safe.publicPrivilegeUsed, true);

  const unsafe = buildRuntimeHardeningPlan({
    currentSession: { canCreateRole: false },
    database: { stateAlreadySafe: false, publicConnect: false, publicCreate: false, mutationAuthority: false },
    schema: { stateAlreadySafe: false, publicUsage: false, publicCreate: false, mutationAuthority: false },
    tables: [
      {
        tableName: "products",
        exists: false,
        currentUserIsOwner: false,
        expectedPrivileges: ["SELECT"],
        grantOptions: { SELECT: false },
        publicOvergrantCount: 1
      },
      {
        tableName: "buyers",
        exists: true,
        currentUserIsOwner: true,
        expectedPrivileges: [],
        grantOptions: {},
        publicOvergrantCount: 1
      }
    ]
  });
  assert.equal(unsafe.ok, false);
  assert.deepEqual(
    unsafe.failedChecks,
    [
      "authority.createRole",
      "authority.databaseAcl",
      "authority.schemaAcl",
      "manifest.missingTables",
      "tables.publicOvergrant"
    ]
  );
});

test("hardener result and sanitized errors do not expose sensitive values", async () => {
  const pool = createFakePool();
  const result = await hardenRuntimePrivileges({ pool });
  assert.doesNotMatch(JSON.stringify(result), unsafeOutputPattern);

  const leakingPool = createFakePool({ throwOn: "grant SELECT" });
  leakingPool.calls.length = 0;
  await assert.rejects(async () => {
    const client = await leakingPool.connect();
    client.query = async () => {
      throw new Error("DATABASE_URL contained unsafe value");
    };
    await hardenRuntimePrivileges({ pool: leakingPool });
  }, /Runtime privilege hardening failed/);
});
