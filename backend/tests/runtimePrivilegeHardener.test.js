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
import { hardenRuntimePrivileges } from "../src/db/runtimePrivilegeHardener.js";
import { assertRuntimeHardeningAllowed } from "../src/scripts/applyStagingRuntimePrivileges.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(currentDir, "..");
const queryDir = path.join(backendRoot, "src", "db", "queries");
const forbiddenBroadPrivilegePattern = /\b(ALL\s+PRIVILEGES|ALL\s+TABLES)\b/i;
const unsafeOutputPattern =
  /DATABASE_URL|postgres:\/\/|postgresql:\/\/|password|private_key|BEGIN PRIVATE KEY|auth_uid|email/i;

function createFakePool(overrides = {}) {
  const calls = [];
  let released = false;
  const state = {
    roleExists: false,
    unsafeExistingRole: false,
    throwOn: null,
    ...overrides
  };

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
      if (/^alter role "noblesse_staging_runtime_role"/i.test(normalizedSql)) {
        state.roleExists = true;
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
        const [, tableName] = String(params?.[1] || "").split(".");
        const privilege = params?.[2];
        const expected = new Set(runtimePrivilegeManifest[tableName] || []);
        return { rows: [{ allowed: expected.has(privilege) }] };
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
});

test("hardener SQL avoids broad privilege and schema/database CREATE grants", async () => {
  const pool = createFakePool();
  await hardenRuntimePrivileges({ pool });

  for (const call of pool.calls) {
    assert.doesNotMatch(call.sql, forbiddenBroadPrivilegePattern);
    assert.doesNotMatch(call.sql, /^grant create on (schema|database)/i);
  }
  assert.ok(pool.calls.some((call) => /^revoke create on schema/i.test(call.sql)));
  assert.ok(pool.calls.some((call) => /^revoke create on database/i.test(call.sql)));
});

test("hardener never grants migration ledger access", async () => {
  const pool = createFakePool();
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

test("hardener rolls back on failure and releases the client", async () => {
  const pool = createFakePool({ throwOn: "grant usage on schema" });
  await assert.rejects(() => hardenRuntimePrivileges({ pool }), /synthetic hardening failure/);

  assert.equal(pool.calls.at(-1).sql, "rollback");
  assert.equal(pool.released, true);
});

test("hardener refuses an existing role with unsafe attributes", async () => {
  const pool = createFakePool({ roleExists: true, unsafeExistingRole: true });
  await assert.rejects(
    () => hardenRuntimePrivileges({ pool }),
    /unsafe attributes/
  );
  assert.equal(pool.calls.at(-1).sql, "rollback");
});

test("hardener result and sanitized errors do not expose sensitive values", async () => {
  const pool = createFakePool();
  const result = await hardenRuntimePrivileges({ pool });
  assert.doesNotMatch(JSON.stringify(result), unsafeOutputPattern);

  const leakingPool = createFakePool({ throwOn: "grant connect" });
  leakingPool.calls.length = 0;
  await assert.rejects(async () => {
    const client = await leakingPool.connect();
    client.query = async () => {
      throw new Error("postgres://user:password@example.invalid/db");
    };
    await hardenRuntimePrivileges({ pool: leakingPool });
  }, /Runtime privilege hardening failed/);
});
