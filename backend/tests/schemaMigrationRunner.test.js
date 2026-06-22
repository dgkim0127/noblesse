import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  buildMigrationPlan,
  runSchemaMigration,
  validateMigrationSql
} from "../src/db/schemaMigrationRunner.js";
import {
  assertRunnerAllowed,
  getMigrationNameFromPath,
  resolveSchemaSqlPath
} from "../src/scripts/runStagingSchemaMigration.js";

function createFakePool({ failOnSchema = false, failRollback = false } = {}) {
  const calls = [];
  const client = {
    async query(sql) {
      calls.push(sql);
      if (sql === "CREATE TABLE test_example (id int);" && failOnSchema) {
        throw new Error("synthetic schema failure");
      }
      if (sql === "rollback" && failRollback) {
        throw new Error("synthetic rollback failure");
      }
      return { rows: [] };
    },
    releaseCalled: false,
    release() {
      this.releaseCalled = true;
    }
  };

  return {
    calls,
    client,
    connectCalled: false,
    async connect() {
      this.connectCalled = true;
      return client;
    }
  };
}

const dummySql = "CREATE TABLE test_example (id int);";

test("validateMigrationSql rejects empty SQL", () => {
  assert.throws(() => validateMigrationSql("  "), /empty/i);
});

test("validateMigrationSql rejects transaction-control SQL", () => {
  assert.throws(
    () => validateMigrationSql(`${dummySql}\nCOMMIT;`),
    /transaction-control/i
  );
  assert.throws(() => validateMigrationSql("BEGIN;"), /transaction-control/i);
});

test("runSchemaMigration starts BEGIN, executes schema SQL, and commits", async () => {
  const pool = createFakePool();
  const result = await runSchemaMigration({
    pool,
    sqlText: dummySql,
    migrationName: "test-schema"
  });

  assert.equal(pool.connectCalled, true);
  assert.deepEqual(pool.calls, ["begin", dummySql, "commit"]);
  assert.equal(pool.client.releaseCalled, true);
  assert.equal(result.executed, true);
  assert.equal(result.transaction, "committed");
  assert.equal(result.migrationName, "test-schema");
});

test("runSchemaMigration rolls back on SQL failure", async () => {
  const pool = createFakePool({ failOnSchema: true });

  await assert.rejects(
    () => runSchemaMigration({ pool, sqlText: dummySql }),
    /synthetic schema failure/
  );

  assert.deepEqual(pool.calls, ["begin", dummySql, "rollback"]);
  assert.equal(pool.client.releaseCalled, true);
});

test("rollback failure does not hide original SQL failure", async () => {
  const pool = createFakePool({ failOnSchema: true, failRollback: true });

  await assert.rejects(
    () => runSchemaMigration({ pool, sqlText: dummySql }),
    /synthetic schema failure/
  );

  assert.deepEqual(pool.calls, ["begin", dummySql, "rollback"]);
  assert.equal(pool.client.releaseCalled, true);
});

test("result is sanitized and does not contain SQL body", async () => {
  const pool = createFakePool();
  const result = await runSchemaMigration({ pool, sqlText: dummySql });

  assert.doesNotMatch(JSON.stringify(result), /CREATE TABLE test_example/i);
  assert.equal(typeof result.statementCountEstimate, "number");
});

test("error messages do not contain secret-shaped values", async () => {
  const pool = {
    async connect() {
      return {
        async query(sql) {
          if (sql === dummySql) {
            throw new Error("postgres://user:password@example/private_key");
          }
          return { rows: [] };
        },
        release() {}
      };
    }
  };

  await assert.rejects(
    () => runSchemaMigration({ pool, sqlText: dummySql }),
    (error) => {
      assert.match(error.message, /Schema migration failed/);
      assert.doesNotMatch(error.message, /DATABASE_URL|postgres:\/\/|password|private_key/i);
      return true;
    }
  );
});

test("script guard refuses to run without ALLOW_STAGING_SCHEMA_MIGRATION_RUNNER=true", () => {
  assert.throws(() => assertRunnerAllowed({}), /disabled/);
  assert.doesNotThrow(() =>
    assertRunnerAllowed({ ALLOW_STAGING_SCHEMA_MIGRATION_RUNNER: "true" })
  );
});

test("migration runner path guard prevents traversal outside repo", () => {
  assert.throws(
    () => resolveSchemaSqlPath({ SCHEMA_SQL_PATH: "..\\outside.sql" }),
    /inside the repository/
  );
});

test("N38-A lifecycle migration has no transaction-control SQL", () => {
  const sqlText = readFileSync(
    join(process.cwd(), "..", "supabase", "migrations", "20260622_admin_rbac_account_lifecycle.sql"),
    "utf8"
  );

  assert.doesNotThrow(() => validateMigrationSql(sqlText));
  assert.doesNotMatch(sqlText, /create type public\.(account_status|buyer_verification_status|admin_role|admin_permission_effect)/i);
  assert.doesNotMatch(sqlText, /::public\.(account_status|buyer_verification_status|admin_role|admin_permission_effect)/i);
  assert.match(sqlText, /account_status text not null default 'active'/i);
  assert.match(sqlText, /verification_status text not null default 'draft'/i);
  assert.match(sqlText, /admin_role text not null default 'operator'/i);
  assert.match(sqlText, /effect text not null/i);
  assert.match(sqlText, /reason text not null/i);
  assert.match(sqlText, /status = 'approved' and coalesce\(account_status, 'active'\) = 'active' then 'owner'/i);
  assert.match(sqlText, /update public\.admin_profiles ap\s+set admin_role = 'operator'/i);
  assert.match(sqlText, /u\.status <> 'approved' or coalesce\(u\.account_status, 'active'\) <> 'active'/i);
  assert.match(sqlText, /set admin_role = 'owner'/i);
});

test("packaged lifecycle migration matches canonical migration exactly", () => {
  const canonical = readFileSync(
    join(process.cwd(), "..", "supabase", "migrations", "20260622_admin_rbac_account_lifecycle.sql"),
    "utf8"
  );
  const packaged = readFileSync(
    join(process.cwd(), "migrations", "20260622_admin_rbac_account_lifecycle.sql"),
    "utf8"
  );

  assert.equal(packaged, canonical);
});

test("migration runner resolves packaged lifecycle migration path explicitly", () => {
  const resolved = resolveSchemaSqlPath({
    SCHEMA_SQL_PATH: "migrations/20260622_admin_rbac_account_lifecycle.sql"
  });

  assert.equal(
    resolved.endsWith("backend\\migrations\\20260622_admin_rbac_account_lifecycle.sql") ||
      resolved.endsWith("backend/migrations/20260622_admin_rbac_account_lifecycle.sql"),
    true
  );
  assert.equal(
    getMigrationNameFromPath(resolved),
    "20260622_admin_rbac_account_lifecycle"
  );
});

test("backend Dockerfile packages migration artifacts without secrets", () => {
  const dockerfile = readFileSync(join(process.cwd(), "Dockerfile"), "utf8");

  assert.match(dockerfile, /COPY migrations \.\/migrations/);
  assert.doesNotMatch(dockerfile, /DATABASE_URL|PRIVATE_KEY|SECRET/i);
});

test("fresh install schema matches lifecycle migration enum-like status contracts", () => {
  const schema = readFileSync(join(process.cwd(), "..", "supabase", "schema.sql"), "utf8");
  const migration = readFileSync(
    join(process.cwd(), "..", "supabase", "migrations", "20260622_admin_rbac_account_lifecycle.sql"),
    "utf8"
  );

  for (const fragment of [
    "account_status text not null default 'active'",
    "verification_status text not null default 'draft'",
    "admin_role text not null default 'operator'",
    "effect text not null",
    "reason text not null"
  ]) {
    assert.match(schema, new RegExp(fragment.replace(/[()]/g, "\\$&"), "i"));
    assert.match(migration, new RegExp(fragment.replace(/[()]/g, "\\$&"), "i"));
  }
  assert.match(schema, /account_status in \('active', 'blocked'\)/i);
  assert.match(migration, /account_status in \('active', 'blocked'\)/i);
  assert.match(schema, /admin_role in \('operator', 'manager', 'owner'\)/i);
  assert.match(migration, /admin_role in \('operator', 'manager', 'owner'\)/i);
  assert.match(schema, /effect in \('allow', 'deny'\)/i);
  assert.match(migration, /effect in \('allow', 'deny'\)/i);
});

test("migration runner does not access Secret Manager or open real DB in tests", () => {
  const plan = buildMigrationPlan({ sqlText: dummySql, migrationName: "unit-only" });

  assert.equal(plan.transactionManagedByRunner, true);
  assert.equal(plan.migrationName, "unit-only");
});
