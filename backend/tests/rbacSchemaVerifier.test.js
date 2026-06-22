import assert from "node:assert/strict";
import test from "node:test";
import {
  buildExpectedMigrationChecksum,
  verifyRbacSchema
} from "../src/db/rbacSchemaVerifier.js";
import {
  assertVerifierAllowed,
  resolveRbacMigrationPath
} from "../src/scripts/verifyStagingRbacSchema.js";

const migrationSqlText = "alter table public.users add column if not exists account_status text;";
const migrationName = "20260622_admin_rbac_account_lifecycle";
const forbiddenMutationPattern =
  /^\s*(insert|update|delete|alter|create|drop|truncate|grant|revoke|comment)\b/i;

const expectedTables = [
  "users",
  "buyers",
  "admin_profiles",
  "admin_permission_overrides",
  "app_schema_migrations",
  "audit_logs"
];
const expectedColumns = [
  ["users", "account_status", "NO", "'active'::text"],
  ["buyers", "verification_status", "NO", "'draft'::text"],
  ["buyers", "submitted_at", "YES", null],
  ["buyers", "reviewed_at", "YES", null],
  ["buyers", "reviewed_by", "YES", null],
  ["buyers", "rejection_reason", "YES", null],
  ["buyers", "suspension_reason", "YES", null],
  ["buyers", "assigned_admin_id", "YES", null],
  ["buyers", "internal_memo", "YES", null],
  ["admin_profiles", "user_id", "NO", null],
  ["admin_profiles", "admin_role", "NO", "'operator'::text"],
  ["admin_profiles", "created_at", "NO", "now()"],
  ["admin_profiles", "updated_at", "NO", "now()"],
  ["admin_permission_overrides", "user_id", "NO", null],
  ["admin_permission_overrides", "permission_key", "NO", null],
  ["admin_permission_overrides", "effect", "NO", null],
  ["admin_permission_overrides", "reason", "NO", null],
  ["admin_permission_overrides", "granted_by", "YES", null],
  ["admin_permission_overrides", "expires_at", "YES", null],
  ["audit_logs", "target_table", "YES", null],
  ["audit_logs", "target_id", "YES", null],
  ["audit_logs", "before_snapshot", "YES", null],
  ["audit_logs", "after_snapshot", "YES", null]
];
const expectedConstraints = [
  "users_account_status_check",
  "buyers_verification_status_check",
  "admin_profiles_admin_role_check",
  "admin_permission_overrides_effect_check"
];
const expectedIndexes = [
  "idx_users_account_status",
  "idx_buyers_verification_status",
  "idx_buyers_assigned_admin_id",
  "idx_admin_permission_overrides_user",
  "idx_admin_permission_overrides_active"
];
const expectedTriggers = [
  "trg_admin_profiles_updated_at",
  "trg_admin_permission_overrides_updated_at"
];

function createFakePool(overrides = {}) {
  const calls = [];
  let released = false;
  const checksum = buildExpectedMigrationChecksum(migrationSqlText);
  const state = {
    ledgerTableExists: true,
    ledgerRowCount: 1,
    checksumMatches: true,
    missingTable: null,
    missingColumn: null,
    missingConstraint: null,
    missingIndex: null,
    missingTrigger: null,
    lifecycle: {
      null_account_status_count: 0,
      invalid_account_status_count: 0,
      null_verification_status_count: 0,
      invalid_verification_status_count: 0,
      legacy_mismatch_count: 0
    },
    admins: {
      total_admin_users: 1,
      admin_profile_count: 1,
      missing_admin_profile_count: 0,
      non_admin_profile_count: 0,
      invalid_admin_role_count: 0,
      active_approved_admin_count: 1,
      active_approved_owner_count: 1,
      inactive_or_unapproved_owner_count: 0
    },
    overrides: {
      invalid_effect_count: 0,
      blank_reason_count: 0,
      owner_override_count: 0,
      non_delegable_override_count: 0,
      orphan_granted_by_count: 0
    },
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
      if (normalizedSql === "commit" || normalizedSql === "rollback") return { rows: [] };
      if (/current_setting\('transaction_read_only'\)/i.test(normalizedSql)) {
        return { rows: [{ read_only: "on" }] };
      }
      if (/to_regclass\('public\.app_schema_migrations'\)/i.test(normalizedSql)) {
        return { rows: [{ table_exists: state.ledgerTableExists }] };
      }
      if (/from public\.app_schema_migrations/i.test(normalizedSql)) {
        assert.deepEqual(params, [migrationName, checksum]);
        return {
          rows: [
            {
              row_count: state.ledgerRowCount,
              checksum_matches: state.checksumMatches
            }
          ]
        };
      }
      if (/from information_schema\.tables/i.test(normalizedSql)) {
        return {
          rows: expectedTables
            .filter((table_name) => table_name !== state.missingTable)
            .map((table_name) => ({ table_name }))
        };
      }
      if (/from information_schema\.columns/i.test(normalizedSql)) {
        return {
          rows: expectedColumns
            .filter(([tableName, columnName]) => `${tableName}.${columnName}` !== state.missingColumn)
            .map(([table_name, column_name, is_nullable, column_default]) => ({
              table_name,
              column_name,
              is_nullable,
              column_default
            }))
        };
      }
      if (/from pg_constraint/i.test(normalizedSql)) {
        return {
          rows: expectedConstraints
            .filter((conname) => conname !== state.missingConstraint)
            .map((conname) => ({ conname }))
        };
      }
      if (/from pg_indexes/i.test(normalizedSql)) {
        return {
          rows: expectedIndexes
            .filter((indexname) => indexname !== state.missingIndex)
            .map((indexname) => ({ indexname }))
        };
      }
      if (/from pg_trigger/i.test(normalizedSql)) {
        return {
          rows: expectedTriggers
            .filter((tgname) => tgname !== state.missingTrigger)
            .map((tgname) => ({ tgname }))
        };
      }
      if (/legacy_mismatch_count/i.test(normalizedSql)) {
        return { rows: [state.lifecycle] };
      }
      if (/total_admin_users/i.test(normalizedSql)) {
        return { rows: [state.admins] };
      }
      if (/owner_override_count/i.test(normalizedSql)) {
        return { rows: [state.overrides] };
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

async function runVerifier(pool = createFakePool()) {
  return verifyRbacSchema({
    pool,
    migrationSqlText,
    migrationName
  });
}

test("script guard refuses to run without explicit staging verification allow flag", () => {
  assert.throws(() => assertVerifierAllowed({}), /disabled/);
  assert.doesNotThrow(() =>
    assertVerifierAllowed({ ALLOW_STAGING_RBAC_VERIFICATION: "true" })
  );
});

test("migration path guard allows only packaged RBAC migration path", () => {
  assert.throws(
    () => resolveRbacMigrationPath({ RBAC_MIGRATION_PATH: "../supabase/schema.sql" }),
    /packaged lifecycle migration/
  );
  const resolved = resolveRbacMigrationPath({
    RBAC_MIGRATION_PATH: "migrations/20260622_admin_rbac_account_lifecycle.sql"
  });
  assert.equal(
    resolved.endsWith("backend\\migrations\\20260622_admin_rbac_account_lifecycle.sql") ||
      resolved.endsWith("backend/migrations/20260622_admin_rbac_account_lifecycle.sql"),
    true
  );
});

test("verifier succeeds with read-only transaction and sanitized aggregate result", async () => {
  const pool = createFakePool();
  const result = await runVerifier(pool);

  assert.equal(result.ok, true);
  assert.equal(result.readOnlyTransaction, true);
  assert.equal(result.migrationLedger.rowCount, 1);
  assert.equal(result.migrationLedger.checksumMatches, true);
  assert.equal(result.admins.activeApprovedOwnerCount, 1);
  assert.deepEqual(result.failedChecks, []);
  assert.equal(pool.calls[0].sql, "begin transaction read only");
  assert.equal(pool.calls.at(-1).sql, "commit");
  assert.equal(pool.released, true);

  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /email|authUid|password|token|databaseUrl|postgres:\/\//i);
  assert.doesNotMatch(serialized, /[a-f0-9]{64}/i);
});

test("verifier SQL does not include mutation statements", async () => {
  const pool = createFakePool();
  await runVerifier(pool);

  for (const call of pool.calls) {
    assert.doesNotMatch(call.sql, forbiddenMutationPattern);
  }
});

test("missing ledger row fails without raw checksum output", async () => {
  const result = await runVerifier(createFakePool({ ledgerRowCount: 0, checksumMatches: false }));

  assert.equal(result.ok, false);
  assert.equal(result.migrationLedger.migrationRowExists, false);
  assert.match(result.failedChecks.join(","), /migrationLedger\.migrationRowExists/);
  assert.doesNotMatch(JSON.stringify(result), /[a-f0-9]{64}/i);
});

test("checksum mismatch fails as a sanitized boolean", async () => {
  const result = await runVerifier(createFakePool({ checksumMatches: false }));

  assert.equal(result.ok, false);
  assert.equal(result.migrationLedger.checksumMatches, false);
  assert.match(result.failedChecks.join(","), /migrationLedger\.checksumMatches/);
});

test("missing schema objects fail by check name only", async () => {
  const result = await runVerifier(
    createFakePool({
      missingTable: "admin_profiles",
      missingColumn: "buyers.reviewed_by",
      missingConstraint: "users_account_status_check",
      missingIndex: "idx_buyers_assigned_admin_id",
      missingTrigger: "trg_admin_profiles_updated_at"
    })
  );

  assert.equal(result.ok, false);
  assert.equal(result.schema.tablesValid, false);
  assert.equal(result.schema.columnsValid, false);
  assert.equal(result.schema.constraintsValid, false);
  assert.equal(result.schema.indexesValid, false);
  assert.equal(result.schema.triggersValid, false);
});

test("invalid lifecycle counts fail verification", async () => {
  const result = await runVerifier(
    createFakePool({
      lifecycle: {
        null_account_status_count: 1,
        invalid_account_status_count: 2,
        null_verification_status_count: 3,
        invalid_verification_status_count: 4,
        legacy_mismatch_count: 5
      }
    })
  );

  assert.equal(result.ok, false);
  assert.equal(result.lifecycle.legacyMismatchCount, 5);
  assert.match(result.failedChecks.join(","), /lifecycle\.legacyMismatchCount/);
});

test("missing admin profile fails verification", async () => {
  const result = await runVerifier(
    createFakePool({
      admins: {
        total_admin_users: 1,
        admin_profile_count: 0,
        missing_admin_profile_count: 1,
        non_admin_profile_count: 0,
        invalid_admin_role_count: 0,
        active_approved_admin_count: 1,
        active_approved_owner_count: 0,
        inactive_or_unapproved_owner_count: 0
      }
    })
  );

  assert.equal(result.ok, false);
  assert.match(result.failedChecks.join(","), /admins\.missingAdminProfileCount/);
});

test("active approved admin without owner fails verification", async () => {
  const result = await runVerifier(
    createFakePool({
      admins: {
        total_admin_users: 1,
        admin_profile_count: 1,
        missing_admin_profile_count: 0,
        non_admin_profile_count: 0,
        invalid_admin_role_count: 0,
        active_approved_admin_count: 1,
        active_approved_owner_count: 0,
        inactive_or_unapproved_owner_count: 0
      }
    })
  );

  assert.equal(result.ok, false);
  assert.match(result.failedChecks.join(","), /admins\.activeApprovedOwnerCount/);
});

test("inactive owner and non-admin profile fail verification", async () => {
  const result = await runVerifier(
    createFakePool({
      admins: {
        total_admin_users: 1,
        admin_profile_count: 2,
        missing_admin_profile_count: 0,
        non_admin_profile_count: 1,
        invalid_admin_role_count: 0,
        active_approved_admin_count: 1,
        active_approved_owner_count: 1,
        inactive_or_unapproved_owner_count: 1
      }
    })
  );

  assert.equal(result.ok, false);
  assert.match(result.failedChecks.join(","), /admins\.nonAdminProfileCount/);
  assert.match(result.failedChecks.join(","), /admins\.inactiveOrUnapprovedOwnerCount/);
});

test("owner and non-delegable overrides fail verification", async () => {
  const result = await runVerifier(
    createFakePool({
      overrides: {
        invalid_effect_count: 0,
        blank_reason_count: 0,
        owner_override_count: 1,
        non_delegable_override_count: 1,
        orphan_granted_by_count: 0
      }
    })
  );

  assert.equal(result.ok, false);
  assert.match(result.failedChecks.join(","), /overrides\.ownerOverrideCount/);
  assert.match(result.failedChecks.join(","), /overrides\.nonDelegableOverrideCount/);
});

test("blank reason and invalid effect fail verification", async () => {
  const result = await runVerifier(
    createFakePool({
      overrides: {
        invalid_effect_count: 1,
        blank_reason_count: 1,
        owner_override_count: 0,
        non_delegable_override_count: 0,
        orphan_granted_by_count: 0
      }
    })
  );

  assert.equal(result.ok, false);
  assert.match(result.failedChecks.join(","), /overrides\.invalidEffectCount/);
  assert.match(result.failedChecks.join(","), /overrides\.blankReasonCount/);
});

test("query failure rolls back and returns a safe error", async () => {
  const pool = createFakePool({ throwOn: "information_schema\\.columns" });

  await assert.rejects(
    () => runVerifier(pool),
    (error) => {
      assert.match(error.message, /synthetic verifier failure|RBAC schema verification failed/);
      assert.doesNotMatch(error.message, /DATABASE_URL|postgres:\/\/|password|email/i);
      return true;
    }
  );
  assert.equal(pool.calls.at(-1).sql, "rollback");
  assert.equal(pool.released, true);
});
