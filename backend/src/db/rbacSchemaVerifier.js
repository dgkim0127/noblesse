import { createHash } from "node:crypto";

const forbiddenSqlPattern =
  /^\s*(insert|update|delete|alter|create|drop|truncate|grant|revoke|comment)\b/i;
const unsafeErrorPattern =
  /DATABASE_URL|postgres:\/\/|postgresql:\/\/|password|private_key|BEGIN PRIVATE KEY|auth_uid|email/i;

const expectedTables = [
  "users",
  "buyers",
  "admin_profiles",
  "admin_permission_overrides",
  "app_schema_migrations",
  "audit_logs"
];

const expectedColumns = {
  users: ["account_status"],
  buyers: [
    "verification_status",
    "submitted_at",
    "reviewed_at",
    "reviewed_by",
    "rejection_reason",
    "suspension_reason",
    "assigned_admin_id",
    "internal_memo"
  ],
  admin_profiles: ["user_id", "admin_role", "created_at", "updated_at"],
  admin_permission_overrides: [
    "user_id",
    "permission_key",
    "effect",
    "reason",
    "granted_by",
    "expires_at"
  ],
  audit_logs: ["target_table", "target_id", "before_snapshot", "after_snapshot"]
};

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

const allowedAccountStatuses = ["active", "blocked"];
const allowedVerificationStatuses = ["draft", "pending", "approved", "rejected", "suspended"];
const allowedAdminRoles = ["operator", "manager", "owner"];
const allowedOverrideEffects = ["allow", "deny"];
const nonDelegablePermissions = ["admins.manage", "settings.manage"];

export class RbacSchemaVerificationError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "RbacSchemaVerificationError";
    this.cause = options.cause;
  }
}

function sanitizeError(error) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (!message || unsafeErrorPattern.test(message)) {
    return new RbacSchemaVerificationError("RBAC schema verification failed.", {
      cause: error
    });
  }
  return new RbacSchemaVerificationError(message, { cause: error });
}

function assertReadOnlySql(sql) {
  const normalized = typeof sql === "string" ? sql.trim() : "";
  if (forbiddenSqlPattern.test(normalized)) {
    throw new RbacSchemaVerificationError("Verifier SQL must be read-only.");
  }
}

async function safeQuery(client, sql, params) {
  assertReadOnlySql(sql);
  return client.query(sql, params);
}

function toNumber(value) {
  return Number(value || 0);
}

function rowsToPresenceMap(rows, key, expected) {
  const found = new Set((rows || []).map((row) => row[key]));
  return Object.fromEntries(expected.map((name) => [name, found.has(name)]));
}

function columnsToPresenceMap(rows) {
  const found = new Set((rows || []).map((row) => `${row.table_name}.${row.column_name}`));
  const result = {};
  for (const [tableName, columns] of Object.entries(expectedColumns)) {
    for (const columnName of columns) {
      result[`${tableName}.${columnName}`] = found.has(`${tableName}.${columnName}`);
    }
  }
  return result;
}

function allTrue(values) {
  return Object.values(values).every(Boolean);
}

function collectFailedChecks(result) {
  const failed = [];
  if (!result.readOnlyTransaction) failed.push("readOnlyTransaction");
  if (!result.migrationLedger.tableExists) failed.push("migrationLedger.tableExists");
  if (!result.migrationLedger.migrationRowExists) failed.push("migrationLedger.migrationRowExists");
  if (result.migrationLedger.rowCount !== 1) failed.push("migrationLedger.rowCount");
  if (!result.migrationLedger.checksumMatches) failed.push("migrationLedger.checksumMatches");
  if (!result.schema.tablesValid) failed.push("schema.tablesValid");
  if (!result.schema.columnsValid) failed.push("schema.columnsValid");
  if (!result.schema.constraintsValid) failed.push("schema.constraintsValid");
  if (!result.schema.indexesValid) failed.push("schema.indexesValid");
  if (!result.schema.triggersValid) failed.push("schema.triggersValid");
  if (result.lifecycle.nullAccountStatusCount !== 0) failed.push("lifecycle.nullAccountStatusCount");
  if (result.lifecycle.invalidAccountStatusCount !== 0) {
    failed.push("lifecycle.invalidAccountStatusCount");
  }
  if (result.lifecycle.nullVerificationStatusCount !== 0) {
    failed.push("lifecycle.nullVerificationStatusCount");
  }
  if (result.lifecycle.invalidVerificationStatusCount !== 0) {
    failed.push("lifecycle.invalidVerificationStatusCount");
  }
  if (result.lifecycle.legacyMismatchCount !== 0) failed.push("lifecycle.legacyMismatchCount");
  if (result.admins.missingAdminProfileCount !== 0) failed.push("admins.missingAdminProfileCount");
  if (result.admins.nonAdminProfileCount !== 0) failed.push("admins.nonAdminProfileCount");
  if (result.admins.invalidAdminRoleCount !== 0) failed.push("admins.invalidAdminRoleCount");
  if (result.admins.inactiveOrUnapprovedOwnerCount !== 0) {
    failed.push("admins.inactiveOrUnapprovedOwnerCount");
  }
  if (result.admins.activeApprovedAdminCount > 0 && result.admins.activeApprovedOwnerCount < 1) {
    failed.push("admins.activeApprovedOwnerCount");
  }
  if (result.overrides.invalidEffectCount !== 0) failed.push("overrides.invalidEffectCount");
  if (result.overrides.blankReasonCount !== 0) failed.push("overrides.blankReasonCount");
  if (result.overrides.ownerOverrideCount !== 0) failed.push("overrides.ownerOverrideCount");
  if (result.overrides.nonDelegableOverrideCount !== 0) {
    failed.push("overrides.nonDelegableOverrideCount");
  }
  return failed;
}

export function buildExpectedMigrationChecksum(sqlText) {
  if (typeof sqlText !== "string" || sqlText.trim().length === 0) {
    throw new RbacSchemaVerificationError("Migration SQL is empty.");
  }
  return createHash("sha256").update(sqlText, "utf8").digest("hex");
}

export async function verifyRbacSchema({
  pool,
  migrationSqlText,
  migrationName = "20260622_admin_rbac_account_lifecycle",
  logger
}) {
  if (!pool || typeof pool.connect !== "function") {
    throw new RbacSchemaVerificationError("RBAC verifier requires a transaction-capable pool.");
  }

  const checksum = buildExpectedMigrationChecksum(migrationSqlText);
  const client = await pool.connect();
  logger?.info?.("rbac schema verification started");

  try {
    await safeQuery(client, "begin transaction read only");
    const readOnlyState = await safeQuery(
      client,
      "select current_setting('transaction_read_only') as read_only"
    );
    const readOnlyValue = readOnlyState.rows?.[0]?.read_only;
    const readOnlyTransaction = readOnlyValue === "on" || readOnlyValue === true;

    const ledgerTable = await safeQuery(
      client,
      "select to_regclass('public.app_schema_migrations') is not null as table_exists"
    );
    const ledgerTableExists = Boolean(ledgerTable.rows?.[0]?.table_exists);
    let migrationRowExists = false;
    let rowCount = 0;
    let checksumMatches = false;
    if (ledgerTableExists) {
      const ledger = await safeQuery(
        client,
        `
          select
            count(*)::int as row_count,
            coalesce(bool_or(checksum = $2), false) as checksum_matches
          from public.app_schema_migrations
          where migration_name = $1
        `,
        [migrationName, checksum]
      );
      rowCount = toNumber(ledger.rows?.[0]?.row_count);
      migrationRowExists = rowCount > 0;
      checksumMatches = Boolean(ledger.rows?.[0]?.checksum_matches);
    }

    const tables = await safeQuery(
      client,
      `
        select table_name
        from information_schema.tables
        where table_schema = 'public'
          and table_name = any($1::text[])
      `,
      [expectedTables]
    );
    const tableChecks = rowsToPresenceMap(tables.rows, "table_name", expectedTables);

    const columns = await safeQuery(
      client,
      `
        select table_name, column_name, is_nullable, column_default
        from information_schema.columns
        where table_schema = 'public'
          and table_name = any($1::text[])
      `,
      [Object.keys(expectedColumns)]
    );
    const columnChecks = columnsToPresenceMap(columns.rows);
    const columnRows = columns.rows || [];
    const findColumn = (tableName, columnName) =>
      columnRows.find((row) => row.table_name === tableName && row.column_name === columnName);
    const usersAccountStatus = findColumn("users", "account_status");
    const buyersVerificationStatus = findColumn("buyers", "verification_status");
    const overrideReason = findColumn("admin_permission_overrides", "reason");
    const columnContractChecks = {
      usersAccountStatusNotNull: usersAccountStatus?.is_nullable === "NO",
      usersAccountStatusDefaultActive: /'active'::text|'active'/i.test(
        usersAccountStatus?.column_default || ""
      ),
      buyersVerificationStatusNotNull: buyersVerificationStatus?.is_nullable === "NO",
      buyersVerificationStatusDefaultDraft: /'draft'::text|'draft'/i.test(
        buyersVerificationStatus?.column_default || ""
      ),
      overrideReasonNotNull: overrideReason?.is_nullable === "NO"
    };

    const constraints = await safeQuery(
      client,
      `
        select conname
        from pg_constraint
        where connamespace = 'public'::regnamespace
          and conname = any($1::text[])
      `,
      [expectedConstraints]
    );
    const constraintChecks = rowsToPresenceMap(constraints.rows, "conname", expectedConstraints);

    const indexes = await safeQuery(
      client,
      `
        select indexname
        from pg_indexes
        where schemaname = 'public'
          and indexname = any($1::text[])
      `,
      [expectedIndexes]
    );
    const indexChecks = rowsToPresenceMap(indexes.rows, "indexname", expectedIndexes);

    const triggers = await safeQuery(
      client,
      `
        select t.tgname
        from pg_trigger t
        join pg_class c on c.oid = t.tgrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and t.tgisinternal = false
          and t.tgname = any($1::text[])
      `,
      [expectedTriggers]
    );
    const triggerChecks = rowsToPresenceMap(triggers.rows, "tgname", expectedTriggers);

    const lifecycle = await safeQuery(
      client,
      `
        select
          (select count(*)::int from public.users where account_status is null)
            as null_account_status_count,
          (select count(*)::int from public.users where account_status is not null and account_status <> all($1::text[]))
            as invalid_account_status_count,
          (select count(*)::int from public.buyers where verification_status is null)
            as null_verification_status_count,
          (select count(*)::int from public.buyers where verification_status is not null and verification_status <> all($2::text[]))
            as invalid_verification_status_count,
          (
            select count(*)::int
            from public.buyers b
            join public.users u on u.id = b.user_id
            where u.status is distinct from (
              case
                when u.account_status = 'blocked' then 'blocked'
                when b.verification_status = 'suspended' then 'blocked'
                when b.verification_status = 'approved' then 'approved'
                else 'pending'
              end
            )
          ) as legacy_mismatch_count
      `,
      [allowedAccountStatuses, allowedVerificationStatuses]
    );
    const lifecycleRow = lifecycle.rows?.[0] || {};

    const admins = await safeQuery(
      client,
      `
        select
          (select count(*)::int from public.users where role = 'admin') as total_admin_users,
          (select count(*)::int from public.admin_profiles) as admin_profile_count,
          (
            select count(*)::int
            from public.users u
            left join public.admin_profiles ap on ap.user_id = u.id
            where u.role = 'admin' and ap.user_id is null
          ) as missing_admin_profile_count,
          (
            select count(*)::int
            from public.admin_profiles ap
            left join public.users u on u.id = ap.user_id
            where u.id is null or u.role <> 'admin'
          ) as non_admin_profile_count,
          (
            select count(*)::int
            from public.admin_profiles
            where admin_role <> all($1::text[])
          ) as invalid_admin_role_count,
          (
            select count(*)::int
            from public.users
            where role = 'admin' and status = 'approved' and account_status = 'active'
          ) as active_approved_admin_count,
          (
            select count(*)::int
            from public.users u
            join public.admin_profiles ap on ap.user_id = u.id
            where u.role = 'admin'
              and u.status = 'approved'
              and u.account_status = 'active'
              and ap.admin_role = 'owner'
          ) as active_approved_owner_count,
          (
            select count(*)::int
            from public.admin_profiles ap
            left join public.users u on u.id = ap.user_id
            where ap.admin_role = 'owner'
              and (
                u.id is null
                or u.role <> 'admin'
                or u.status <> 'approved'
                or u.account_status <> 'active'
              )
          ) as inactive_or_unapproved_owner_count
      `,
      [allowedAdminRoles]
    );
    const adminRow = admins.rows?.[0] || {};

    const overrides = await safeQuery(
      client,
      `
        select
          (select count(*)::int from public.admin_permission_overrides where effect <> all($1::text[]))
            as invalid_effect_count,
          (select count(*)::int from public.admin_permission_overrides where reason is null or btrim(reason) = '')
            as blank_reason_count,
          (
            select count(*)::int
            from public.admin_permission_overrides apo
            join public.admin_profiles ap on ap.user_id = apo.user_id
            where ap.admin_role = 'owner'
          ) as owner_override_count,
          (
            select count(*)::int
            from public.admin_permission_overrides
            where permission_key = any($2::text[])
          ) as non_delegable_override_count,
          (
            select count(*)::int
            from public.admin_permission_overrides apo
            left join public.users u on u.id = apo.granted_by
            where apo.granted_by is not null and u.id is null
          ) as orphan_granted_by_count
      `,
      [allowedOverrideEffects, nonDelegablePermissions]
    );
    const overrideRow = overrides.rows?.[0] || {};

    const result = {
      ok: false,
      readOnlyTransaction,
      migrationLedger: {
        tableExists: ledgerTableExists,
        migrationRowExists,
        rowCount,
        checksumMatches
      },
      schema: {
        tables: tableChecks,
        columns: columnChecks,
        columnContracts: columnContractChecks,
        constraints: constraintChecks,
        indexes: indexChecks,
        triggers: triggerChecks,
        tablesValid: allTrue(tableChecks),
        columnsValid: allTrue(columnChecks) && allTrue(columnContractChecks),
        constraintsValid: allTrue(constraintChecks),
        indexesValid: allTrue(indexChecks),
        triggersValid: allTrue(triggerChecks)
      },
      lifecycle: {
        nullAccountStatusCount: toNumber(lifecycleRow.null_account_status_count),
        invalidAccountStatusCount: toNumber(lifecycleRow.invalid_account_status_count),
        nullVerificationStatusCount: toNumber(lifecycleRow.null_verification_status_count),
        invalidVerificationStatusCount: toNumber(lifecycleRow.invalid_verification_status_count),
        legacyMismatchCount: toNumber(lifecycleRow.legacy_mismatch_count)
      },
      admins: {
        totalAdminUsers: toNumber(adminRow.total_admin_users),
        adminProfileCount: toNumber(adminRow.admin_profile_count),
        missingAdminProfileCount: toNumber(adminRow.missing_admin_profile_count),
        nonAdminProfileCount: toNumber(adminRow.non_admin_profile_count),
        invalidAdminRoleCount: toNumber(adminRow.invalid_admin_role_count),
        activeApprovedAdminCount: toNumber(adminRow.active_approved_admin_count),
        activeApprovedOwnerCount: toNumber(adminRow.active_approved_owner_count),
        inactiveOrUnapprovedOwnerCount: toNumber(
          adminRow.inactive_or_unapproved_owner_count
        )
      },
      overrides: {
        invalidEffectCount: toNumber(overrideRow.invalid_effect_count),
        blankReasonCount: toNumber(overrideRow.blank_reason_count),
        ownerOverrideCount: toNumber(overrideRow.owner_override_count),
        nonDelegableOverrideCount: toNumber(overrideRow.non_delegable_override_count),
        orphanGrantedByCount: toNumber(overrideRow.orphan_granted_by_count)
      }
    };

    result.failedChecks = collectFailedChecks(result);
    result.ok = result.failedChecks.length === 0;
    await safeQuery(client, "commit");
    logger?.info?.("rbac schema verification completed", {
      ok: result.ok,
      failedCheckCount: result.failedChecks.length
    });
    return result;
  } catch (error) {
    try {
      await safeQuery(client, "rollback");
    } catch {
      // Keep the original sanitized verifier failure.
    }
    logger?.error?.("rbac schema verification failed");
    throw sanitizeError(error);
  } finally {
    client.release?.();
  }
}
