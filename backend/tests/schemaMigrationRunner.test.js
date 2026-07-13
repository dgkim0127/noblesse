import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  buildMigrationPlan,
  runSchemaMigration,
  validateMigrationName,
  validateMigrationSql
} from "../src/db/schemaMigrationRunner.js";
import {
  assertRunnerAllowed,
  getMigrationNameFromPath,
  resolveSchemaSqlPath
} from "../src/scripts/runStagingSchemaMigration.js";

function createFakePool({
  failOnSchema = false,
  failOnLedgerInsert = false,
  failRollback = false,
  existingChecksum = null
} = {}) {
  const calls = [];
  const client = {
    async query(sql, params) {
      const normalizedSql = typeof sql === "string" ? sql.trim().replace(/\s+/g, " ") : "";
      calls.push({ sql: normalizedSql, params });
      if (sql === dummySql && failOnSchema) {
        throw new Error("synthetic schema failure");
      }
      if (/insert into public\.app_schema_migrations/i.test(normalizedSql) && failOnLedgerInsert) {
        throw new Error("synthetic ledger insert failure");
      }
      if (sql === "rollback" && failRollback) {
        throw new Error("synthetic rollback failure");
      }
      if (/select checksum from public\.app_schema_migrations/i.test(normalizedSql)) {
        return existingChecksum ? { rows: [{ checksum: existingChecksum }] } : { rows: [] };
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
const ledgerCreatePattern = /create table if not exists public\.app_schema_migrations/i;
const ledgerSelectPattern = /select checksum from public\.app_schema_migrations/i;
const ledgerInsertPattern = /insert into public\.app_schema_migrations/i;
const sqlCalls = (pool) => pool.calls.map((call) => call.sql);

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

test("validateMigrationName rejects empty, path-like, and secret-shaped names", () => {
  assert.throws(() => validateMigrationName(""), /invalid/i);
  assert.throws(() => validateMigrationName("../schema"), /invalid/i);
  assert.throws(() => validateMigrationName("postgres://example"), /invalid/i);
  assert.doesNotThrow(() => validateMigrationName("20260622_admin_rbac_account_lifecycle"));
});

test("runSchemaMigration starts BEGIN, executes schema SQL, inserts ledger, and commits", async () => {
  const pool = createFakePool();
  const result = await runSchemaMigration({
    pool,
    sqlText: dummySql,
    migrationName: "test-schema"
  });

  assert.equal(pool.connectCalled, true);
  assert.equal(pool.calls[0].sql, "begin");
  assert.match(pool.calls[1].sql, ledgerCreatePattern);
  assert.match(pool.calls[2].sql, ledgerSelectPattern);
  assert.deepEqual(pool.calls[2].params, ["test-schema"]);
  assert.equal(pool.calls[3].sql, dummySql);
  assert.match(pool.calls[4].sql, ledgerInsertPattern);
  assert.equal(pool.calls[4].params[0], "test-schema");
  assert.match(pool.calls[4].params[1], /^[a-f0-9]{64}$/);
  assert.equal(pool.calls[5].sql, "commit");
  assert.equal(pool.client.releaseCalled, true);
  assert.equal(result.executed, true);
  assert.equal(result.alreadyApplied, false);
  assert.equal(result.transaction, "committed");
  assert.equal(result.migrationName, "test-schema");
});

test("runSchemaMigration skips schema SQL when ledger checksum already matches", async () => {
  const plan = buildMigrationPlan({ sqlText: dummySql, migrationName: "test-schema" });
  const pool = createFakePool({ existingChecksum: plan.checksum });

  const result = await runSchemaMigration({
    pool,
    sqlText: dummySql,
    migrationName: "test-schema"
  });

  assert.equal(result.executed, false);
  assert.equal(result.alreadyApplied, true);
  assert.equal(pool.calls.some((call) => call.sql === dummySql), false);
  assert.equal(pool.calls.some((call) => ledgerInsertPattern.test(call.sql)), false);
  assert.equal(pool.calls.at(-1).sql, "commit");
});

test("runSchemaMigration fails safely when ledger checksum mismatches and does not run schema SQL", async () => {
  const pool = createFakePool({ existingChecksum: "0".repeat(64) });

  await assert.rejects(
    () => runSchemaMigration({ pool, sqlText: dummySql, migrationName: "test-schema" }),
    /checksum mismatch/i
  );

  assert.equal(pool.calls.some((call) => call.sql === dummySql), false);
  assert.equal(pool.calls.some((call) => ledgerInsertPattern.test(call.sql)), false);
  assert.equal(pool.calls.at(-1).sql, "rollback");
});

test("runSchemaMigration rolls back on SQL failure", async () => {
  const pool = createFakePool({ failOnSchema: true });

  await assert.rejects(
    () => runSchemaMigration({ pool, sqlText: dummySql }),
    /synthetic schema failure/
  );

  assert.equal(sqlCalls(pool).at(-1), "rollback");
  assert.equal(sqlCalls(pool).includes(dummySql), true);
  assert.equal(pool.client.releaseCalled, true);
});

test("rollback failure does not hide original SQL failure", async () => {
  const pool = createFakePool({ failOnSchema: true, failRollback: true });

  await assert.rejects(
    () => runSchemaMigration({ pool, sqlText: dummySql }),
    /synthetic schema failure/
  );

  assert.equal(sqlCalls(pool).at(-1), "rollback");
  assert.equal(sqlCalls(pool).includes(dummySql), true);
  assert.equal(pool.client.releaseCalled, true);
});

test("runSchemaMigration rolls back when ledger insert fails", async () => {
  const pool = createFakePool({ failOnLedgerInsert: true });

  await assert.rejects(
    () => runSchemaMigration({ pool, sqlText: dummySql, migrationName: "test-schema" }),
    /synthetic ledger insert failure/
  );

  assert.equal(sqlCalls(pool).includes(dummySql), true);
  assert.equal(sqlCalls(pool).at(-1), "rollback");
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
  assert.match(sqlText, /add column if not exists account_status text;/i);
  assert.match(sqlText, /where account_status is null;/i);
  assert.match(sqlText, /alter column account_status set default 'active'/i);
  assert.match(sqlText, /alter column account_status set not null/i);
  assert.match(sqlText, /add column if not exists verification_status text,/i);
  assert.match(sqlText, /and b\.verification_status is null/i);
  assert.match(sqlText, /alter column verification_status set default 'draft'/i);
  assert.match(sqlText, /alter column verification_status set not null/i);
  assert.match(sqlText, /admin_role text not null default 'operator'/i);
  assert.match(sqlText, /effect text not null/i);
  assert.match(sqlText, /reason text not null/i);
  assert.match(sqlText, /status = 'approved'\s+and account_status = 'active'/i);
  assert.doesNotMatch(sqlText, /update public\.admin_profiles[\s\S]*set admin_role/i);
  assert.match(sqlText, /raise exception 'Active approved admin exists but no owner admin profile is present/i);
});

test("N38-A lifecycle migration preserves canonical values on repeated runs", () => {
  const sqlText = readFileSync(
    join(process.cwd(), "..", "supabase", "migrations", "20260622_admin_rbac_account_lifecycle.sql"),
    "utf8"
  );

  assert.match(sqlText, /set account_status = case when status = 'blocked' then 'blocked' else 'active' end\s+where account_status is null;/i);
  assert.match(sqlText, /set verification_status = case[\s\S]*and b\.verification_status is null;/i);
  assert.match(sqlText, /set submitted_at = b\.created_at\s+where b\.submitted_at is null;/i);
  assert.match(sqlText, /set reviewed_at = u\.updated_at[\s\S]*and b\.reviewed_at is null/i);
  assert.match(sqlText, /on conflict \(user_id\) do nothing;/i);
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

test("N39 managed FX migration has additive schema and no transaction-control SQL", () => {
  const sqlText = readFileSync(
    join(process.cwd(), "..", "supabase", "migrations", "20260624_managed_fx_review_workflow.sql"),
    "utf8"
  );

  assert.doesNotThrow(() => validateMigrationSql(sqlText));
  assert.match(sqlText, /create table if not exists public\.fx_rate_snapshots/i);
  assert.match(sqlText, /create table if not exists public\.product_price_policies/i);
  assert.match(sqlText, /create table if not exists public\.fx_auto_price_runs/i);
  assert.match(sqlText, /create table if not exists public\.fx_auto_price_events/i);
  assert.doesNotMatch(sqlText, /fx_price_drafts|fx_review_runs|fx_managed/i);
  assert.match(sqlText, /quote_currency text not null check \(quote_currency in \('KRW', 'JPY', 'USD', 'CNY'\)\)/i);
  assert.match(sqlText, /pricing_mode text not null check \(pricing_mode in \('manual_fixed', 'fx_auto'\)\)/i);
  assert.match(sqlText, /update_threshold_bps integer not null default 500/i);
  assert.match(sqlText, /circuit_breaker_bps integer not null default 1500/i);
  assert.match(sqlText, /latest_source_price_updated_at timestamptz/i);
  assert.match(sqlText, /last_applied_source_price_updated_at timestamptz/i);
  assert.match(sqlText, /idempotency_key text/i);
  assert.match(sqlText, /mode_change/i);
  assert.match(sqlText, /event_key text/i);
  assert.match(sqlText, /idx_fx_auto_price_runs_idempotency_key/i);
  assert.match(sqlText, /idx_fx_auto_price_events_event_key/i);
  assert.match(sqlText, /select\s+pp\.product_id,\s+pp\.market,\s+pp\.currency,\s+'manual_fixed'/i);
  assert.match(sqlText, /cross join \(\s*values \('JP', 'JPY'\), \('US', 'USD'\), \('CN', 'CNY'\)\s*\)/i);
  assert.doesNotMatch(sqlText, /'GLOBAL', 'USD'\)[\s\S]*'fx_auto'/i);
  assert.doesNotMatch(sqlText, /\bdrop\s+table\b|\btruncate\b|\bdelete\s+from\b/i);
});

test("packaged managed FX migration matches canonical migration exactly", () => {
  const canonical = readFileSync(
    join(process.cwd(), "..", "supabase", "migrations", "20260624_managed_fx_review_workflow.sql"),
    "utf8"
  );
  const packaged = readFileSync(
    join(process.cwd(), "migrations", "20260624_managed_fx_review_workflow.sql"),
    "utf8"
  );

  assert.equal(packaged, canonical);
});

test("N48 Taiwan market migration enables TWD without copying legacy CNY prices", () => {
  const sqlText = readFileSync(
    join(process.cwd(), "..", "supabase", "migrations", "20260626_tw_market_fx_activation.sql"),
    "utf8"
  );

  assert.doesNotThrow(() => validateMigrationSql(sqlText));
  assert.match(sqlText, /assigned_market in \('KR', 'JP', 'US', 'TW', 'CN', 'GLOBAL'\)/i);
  assert.match(sqlText, /currency in \('KRW', 'JPY', 'USD', 'TWD', 'CNY'\)/i);
  assert.match(sqlText, /target_market = 'TW' and target_currency = 'TWD'/i);
  assert.match(sqlText, /'needs_input'/i);
  assert.match(sqlText, /select\s+legacy\.product_id,\s+'TW',\s+'TWD',\s+'manual_fixed'/i);
  assert.match(sqlText, /select\s+kr\.product_id,\s+'TW',\s+'TWD',\s+'fx_auto'/i);
  assert.match(sqlText, /published_price_id,\s+status,\s+latest_source_price_updated_at/i);
  assert.match(sqlText, /prevent_legacy_cn_cny_market_writes/i);
  assert.match(sqlText, /new\.quote_currency = 'CNY'/i);
  assert.doesNotMatch(sqlText, /select[\s\S]+legacy[\s\S]+published_price_id[\s\S]+where legacy\.target_market = 'CN'/i);
  assert.doesNotMatch(sqlText, /select[\s\S]+from public\.product_prices[\s\S]+market = 'CN'[\s\S]+wholesale_price/i);
  assert.doesNotMatch(sqlText, /\bdrop\s+table\b|\btruncate\b|\bdelete\s+from\b/i);
});

test("packaged Taiwan market migration matches canonical migration exactly", () => {
  const canonical = readFileSync(
    join(process.cwd(), "..", "supabase", "migrations", "20260626_tw_market_fx_activation.sql"),
    "utf8"
  );
  const packaged = readFileSync(
    join(process.cwd(), "migrations", "20260626_tw_market_fx_activation.sql"),
    "utf8"
  );

  assert.equal(packaged, canonical);
});

test("N73 product catalog attribute detail migration is additive", () => {
  const sqlText = readFileSync(
    join(process.cwd(), "..", "supabase", "migrations", "20260702_product_catalog_attribute_details.sql"),
    "utf8"
  );

  assert.doesNotThrow(() => validateMigrationSql(sqlText));
  assert.match(sqlText, /add column if not exists taxonomy jsonb not null default '\{\}'::jsonb/i);
  assert.match(sqlText, /add column if not exists specs jsonb not null default '\{\}'::jsonb/i);
  assert.match(sqlText, /add column if not exists detail_content jsonb not null default '\{\}'::jsonb/i);
  assert.match(sqlText, /add column if not exists home_placement jsonb not null default '\{\}'::jsonb/i);
  assert.match(sqlText, /add column if not exists badge text/i);
  assert.match(sqlText, /idx_products_taxonomy_gin/i);
  assert.match(sqlText, /idx_products_home_placement_gin/i);
  assert.doesNotMatch(sqlText, /\bdrop\b|\btruncate\b|\bdelete\s+from\b|\brename\b/i);
});

test("packaged product catalog attribute detail migration matches canonical migration exactly", () => {
  const canonical = readFileSync(
    join(process.cwd(), "..", "supabase", "migrations", "20260702_product_catalog_attribute_details.sql"),
    "utf8"
  );
  const packaged = readFileSync(
    join(process.cwd(), "migrations", "20260702_product_catalog_attribute_details.sql"),
    "utf8"
  );

  assert.equal(packaged, canonical);
});

test("admin operations redesign migration is additive and supports localized drafts and quote documents", () => {
  const sqlText = readFileSync(
    join(process.cwd(), "..", "supabase", "migrations", "20260713_admin_operations_redesign.sql"),
    "utf8"
  );

  assert.doesNotThrow(() => validateMigrationSql(sqlText));
  assert.match(sqlText, /add column if not exists name_zh_tw text/i);
  assert.match(sqlText, /add column if not exists description_zh_tw text/i);
  assert.match(sqlText, /alter column name_en drop not null/i);
  assert.match(sqlText, /create table if not exists public\.admin_quote_documents/i);
  assert.match(sqlText, /create table if not exists public\.admin_quote_status_history/i);
  assert.match(sqlText, /document_locale in \('kr', 'en', 'jp', 'zh-TW'\)/i);
  assert.match(sqlText, /status in \('draft', 'sent', 'accepted', 'rejected', 'cancelled'\)/i);
  assert.doesNotMatch(sqlText, /\bdrop\s+table\b|\btruncate\b|\bdelete\s+from\b/i);
});

test("packaged admin operations redesign migration matches canonical migration exactly", () => {
  const canonical = readFileSync(
    join(process.cwd(), "..", "supabase", "migrations", "20260713_admin_operations_redesign.sql"),
    "utf8"
  );
  const packaged = readFileSync(
    join(process.cwd(), "migrations", "20260713_admin_operations_redesign.sql"),
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
    "reason text not null",
    "migration_name text primary key",
    "checksum text not null"
  ]) {
    assert.match(schema, new RegExp(fragment.replace(/[()]/g, "\\$&"), "i"));
  }
  assert.match(migration, /alter column account_status set default 'active'/i);
  assert.match(migration, /alter column verification_status set default 'draft'/i);
  assert.match(migration, /admin_role text not null default 'operator'/i);
  assert.match(migration, /effect text not null/i);
  assert.match(migration, /reason text not null/i);
  assert.match(schema, /account_status in \('active', 'blocked'\)/i);
  assert.match(migration, /account_status in \('active', 'blocked'\)/i);
  assert.match(schema, /admin_role in \('operator', 'manager', 'owner'\)/i);
  assert.match(migration, /admin_role in \('operator', 'manager', 'owner'\)/i);
  assert.match(schema, /effect in \('allow', 'deny'\)/i);
  assert.match(migration, /effect in \('allow', 'deny'\)/i);
});

test("fresh install schema includes managed FX review workflow objects", () => {
  const schema = readFileSync(join(process.cwd(), "..", "supabase", "schema.sql"), "utf8");

  for (const fragment of [
    "create table if not exists public.fx_rate_snapshots",
    "create table if not exists public.product_price_policies",
    "create table if not exists public.fx_auto_price_runs",
    "create table if not exists public.fx_auto_price_events",
    "quote_currency text not null check (quote_currency in ('KRW', 'JPY', 'USD', 'TWD'))",
    "pricing_mode text not null check (pricing_mode in ('manual_fixed', 'fx_auto'))",
    "update_threshold_bps integer not null default 500",
    "circuit_breaker_bps integer not null default 1500",
    "latest_source_price_updated_at timestamptz",
    "last_applied_source_price_updated_at timestamptz",
    "idempotency_key text",
    "mode_change",
    "event_key text",
    "idx_fx_auto_price_runs_idempotency_key",
    "idx_fx_auto_price_events_event_key"
  ]) {
    assert.match(schema, new RegExp(fragment.replace(/[()]/g, "\\$&"), "i"));
  }
  assert.doesNotMatch(schema, /fx_price_drafts|fx_review_runs|fx_managed/i);
  assert.doesNotMatch(schema, /'CN'|'CNY'/i);
});

test("fresh install schema includes product catalog attribute detail fields", () => {
  const schema = readFileSync(join(process.cwd(), "..", "supabase", "schema.sql"), "utf8");

  for (const fragment of [
    "taxonomy jsonb not null default '{}'::jsonb",
    "specs jsonb not null default '{}'::jsonb",
    "detail_content jsonb not null default '{}'::jsonb",
    "home_placement jsonb not null default '{}'::jsonb",
    "badge text",
    "idx_products_taxonomy_gin",
    "idx_products_home_placement_gin"
  ]) {
    assert.match(schema, new RegExp(fragment.replace(/[{}()[\]]/g, "\\$&"), "i"));
  }
});

test("migration runner does not access Secret Manager or open real DB in tests", () => {
  const plan = buildMigrationPlan({ sqlText: dummySql, migrationName: "unit-only" });

  assert.equal(plan.transactionManagedByRunner, true);
  assert.equal(plan.migrationName, "unit-only");
});
