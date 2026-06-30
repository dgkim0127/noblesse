import assert from "node:assert/strict";
import test from "node:test";
import {
  diagnoseOwnerSchema,
  validateOwnerSchemaDiagnosisEnv
} from "../src/db/ownerSchemaDiagnosis.js";
import { assertDiagnosisAllowed } from "../src/scripts/diagnoseOwnerSchema.js";

const migrationName = "20260622_admin_rbac_account_lifecycle";
const migrationChecksum = "abc123";

function productionSource(overrides = {}) {
  return {
    NOBLESSE_OWNER_SCHEMA_DIAGNOSIS_ALLOW: "YES",
    NOBLESSE_RUNTIME_ENV: "production",
    ...overrides
  };
}

const baseTables = {
  users: true,
  buyers: true,
  admin_profiles: true,
  admin_permission_overrides: true,
  app_schema_migrations: true,
  audit_logs: true
};

const baseColumns = {
  users: ["id", "email", "auth_uid", "role", "status", "account_status", "created_at", "updated_at"],
  buyers: ["verification_status"],
  admin_profiles: ["user_id", "admin_role", "created_at", "updated_at"],
  admin_permission_overrides: ["user_id", "permission_key", "effect", "reason", "granted_by", "expires_at", "created_at", "updated_at"],
  audit_logs: ["actor_user_id", "actor_role", "action", "target_table", "target_id", "before_snapshot", "after_snapshot", "request_id", "created_at"],
  app_schema_migrations: ["migration_name", "checksum", "applied_at"]
};

function createFakePool(overrides = {}) {
  const calls = [];
  let released = false;
  const state = {
    tables: { ...baseTables },
    columns: Object.fromEntries(Object.entries(baseColumns).map(([key, value]) => [key, [...value]])),
    constraints: ["admin_profiles_admin_role_check", "admin_permission_overrides_effect_check"],
    indexes: ["idx_admin_permission_overrides_user", "idx_admin_permission_overrides_active"],
    triggers: ["trg_admin_profiles_updated_at", "trg_admin_permission_overrides_updated_at"],
    activeApprovedAdminCount: 1,
    activeApprovedOwnerCount: 1,
    adminProfileCount: 1,
    permissionOverrideCount: 0,
    migrationRowCount: 1,
    migrationChecksumMatches: true,
    otherMigrationCount: 0,
    throwOn: null,
    ...overrides
  };

  const client = {
    async query(sql, params = []) {
      const text = String(sql).trim().replace(/\s+/g, " ");
      calls.push({ sql: text, params });
      if (state.throwOn && new RegExp(state.throwOn, "i").test(text)) {
        throw new Error("synthetic diagnosis failure");
      }
      if (text === "begin transaction read only" || text === "commit" || text === "rollback") {
        return { rows: [] };
      }
      if (/current_setting\('transaction_read_only'\)/i.test(text)) {
        return { rows: [{ read_only: "on" }] };
      }
      if (/^select to_regclass\(\$1\) is not null as exists$/i.test(text)) {
        const tableName = String(params[0]).replace(/^public\./, "");
        return { rows: [{ exists: Boolean(state.tables[tableName]) }] };
      }
      if (/from information_schema\.columns/i.test(text)) {
        const tableName = params[0];
        const requested = params[1];
        const existing = new Set(state.columns[tableName] || []);
        return { rows: requested.filter((column_name) => existing.has(column_name)).map((column_name) => ({ column_name })) };
      }
      if (/from pg_constraint/i.test(text)) {
        return { rows: params[0].filter((conname) => state.constraints.includes(conname)).map((conname) => ({ conname })) };
      }
      if (/from pg_indexes/i.test(text)) {
        return { rows: params[0].filter((indexname) => state.indexes.includes(indexname)).map((indexname) => ({ indexname })) };
      }
      if (/from pg_trigger/i.test(text)) {
        return { rows: params[0].filter((tgname) => state.triggers.includes(tgname)).map((tgname) => ({ tgname })) };
      }
      if (/from public\.app_schema_migrations/i.test(text)) {
        return {
          rows: [{
            migration_row_count: state.migrationRowCount,
            checksum_matches: state.migrationChecksumMatches,
            other_migration_count: state.otherMigrationCount
          }]
        };
      }
      if (/from public\.users/i.test(text) && /active_approved_admin_count/i.test(text)) {
        return {
          rows: [{
            active_approved_admin_count: state.activeApprovedAdminCount,
            active_approved_owner_count: state.activeApprovedOwnerCount,
            admin_profile_count: state.adminProfileCount,
            permission_override_count: state.permissionOverrideCount
          }]
        };
      }
      throw new Error(`Unexpected query: ${text}`);
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

test("owner schema diagnosis env rejects missing allow and non-production", () => {
  assert.deepEqual(validateOwnerSchemaDiagnosisEnv({}), { ok: false, category: "DIAGNOSIS_NOT_ALLOWED" });
  assert.deepEqual(
    validateOwnerSchemaDiagnosisEnv(productionSource({ NOBLESSE_RUNTIME_ENV: "staging" })),
    { ok: false, category: "NON_PRODUCTION_RUNTIME" }
  );
  assert.deepEqual(validateOwnerSchemaDiagnosisEnv(productionSource()), { ok: true });
});

test("script guard requires explicit production diagnosis allow", () => {
  assert.throws(() => assertDiagnosisAllowed({}), /disabled/);
  assert.doesNotThrow(() => assertDiagnosisAllowed(productionSource()));
});

test("diagnosis reports current owner schema without secrets", async () => {
  const pool = createFakePool();
  const result = await diagnoseOwnerSchema({ pool, migrationName, migrationChecksum });

  assert.equal(result.ok, true);
  assert.equal(result.category, "CURRENT_OWNER_SCHEMA_READY");
  assert.equal(result.readOnlyTransaction, true);
  assert.equal(result.tables.admin_profiles, true);
  assert.equal(result.admin.activeApprovedOwnerCount, 1);
  assert.equal(pool.calls[0].sql, "begin transaction read only");
  assert.equal(pool.calls.at(-1).sql, "commit");
  assert.equal(pool.released, true);
  assert.doesNotMatch(JSON.stringify(result), /example\.|firebase-|token|password|postgres:\/\//i);
});

test("diagnosis classifies missing RBAC migration when legacy core surface exists", async () => {
  const pool = createFakePool({
    tables: { ...baseTables, admin_profiles: false, admin_permission_overrides: false },
    columns: { ...baseColumns, users: baseColumns.users.filter((column) => column !== "account_status") },
    migrationRowCount: 0,
    migrationChecksumMatches: false,
    activeApprovedOwnerCount: 0,
    adminProfileCount: 0,
    permissionOverrideCount: 0
  });

  const result = await diagnoseOwnerSchema({ pool, migrationName, migrationChecksum });

  assert.equal(result.ok, false);
  assert.equal(result.category, "MISSING_RBAC_OWNER_MIGRATION");
  assert.equal(result.tables.admin_profiles, false);
  assert.equal(result.migrationHistory.relevantMigrationApplied, false);
  assert.equal(result.legacySurface.usersRoleStatusAuthUidReady, true);
});

test("diagnosis fails closed when legacy core user surface is incomplete", async () => {
  const pool = createFakePool({
    tables: { ...baseTables, admin_profiles: false, admin_permission_overrides: false },
    columns: { ...baseColumns, users: baseColumns.users.filter((column) => column !== "auth_uid") },
    migrationRowCount: 0,
    migrationChecksumMatches: false
  });

  const result = await diagnoseOwnerSchema({ pool, migrationName, migrationChecksum });

  assert.equal(result.ok, false);
  assert.equal(result.category, "OWNER_SCHEMA_UNSUPPORTED");
});

test("diagnosis rolls back and sanitizes query errors", async () => {
  const pool = createFakePool({ throwOn: "information_schema\\.columns" });

  await assert.rejects(
    () => diagnoseOwnerSchema({ pool, migrationName, migrationChecksum }),
    (error) => {
      assert.match(error.message, /synthetic diagnosis failure|Owner schema diagnosis failed/);
      assert.doesNotMatch(error.message, /DATABASE_URL|postgres:\/\/|password|email/i);
      return true;
    }
  );
  assert.equal(pool.calls.at(-1).sql, "rollback");
});
