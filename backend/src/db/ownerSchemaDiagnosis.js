const forbiddenSqlPattern =
  /^\s*(insert|update|delete|alter|create|drop|truncate|grant|revoke|comment)\b/i;
const unsafeErrorPattern =
  /DATABASE_URL|postgres:\/\/|postgresql:\/\/|password|private_key|BEGIN PRIVATE KEY|auth_uid|email|token/i;

const expectedTables = [
  "users",
  "buyers",
  "admin_profiles",
  "admin_permission_overrides",
  "app_schema_migrations",
  "audit_logs"
];

const expectedColumns = {
  users: ["id", "email", "auth_uid", "role", "status", "account_status", "created_at", "updated_at"],
  buyers: ["verification_status"],
  admin_profiles: ["user_id", "admin_role", "created_at", "updated_at"],
  admin_permission_overrides: [
    "user_id",
    "permission_key",
    "effect",
    "reason",
    "granted_by",
    "expires_at",
    "created_at",
    "updated_at"
  ],
  audit_logs: [
    "actor_user_id",
    "actor_role",
    "action",
    "target_table",
    "target_id",
    "before_snapshot",
    "after_snapshot",
    "request_id",
    "created_at"
  ],
  app_schema_migrations: ["migration_name", "checksum", "applied_at"]
};

const expectedConstraints = [
  "admin_profiles_admin_role_check",
  "admin_permission_overrides_effect_check"
];

const expectedIndexes = [
  "idx_admin_permission_overrides_user",
  "idx_admin_permission_overrides_active"
];

const expectedTriggers = [
  "trg_admin_profiles_updated_at",
  "trg_admin_permission_overrides_updated_at"
];

export class OwnerSchemaDiagnosisError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "OwnerSchemaDiagnosisError";
    this.cause = options.cause;
  }
}

function hasProductionRuntimeMarker(source = {}) {
  const markers = [
    source.NOBLESSE_RUNTIME_ENV,
    source.NOBLESSE_ENV,
    source.APP_ENV,
    source.CLOUD_RUN_JOB,
    source.K_SERVICE,
    source.GAE_SERVICE
  ]
    .map((value) => String(value || "").toLowerCase())
    .filter(Boolean);

  return markers.some((value) => value === "production" || value.includes("prod"));
}

export function validateOwnerSchemaDiagnosisEnv(source = process.env) {
  if (source.NOBLESSE_OWNER_SCHEMA_DIAGNOSIS_ALLOW !== "YES") {
    return { ok: false, category: "DIAGNOSIS_NOT_ALLOWED" };
  }
  if (!hasProductionRuntimeMarker(source)) {
    return { ok: false, category: "NON_PRODUCTION_RUNTIME" };
  }
  return { ok: true };
}

function sanitizeError(error) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (!message || unsafeErrorPattern.test(message)) {
    return new OwnerSchemaDiagnosisError("Owner schema diagnosis failed.", { cause: error });
  }
  return new OwnerSchemaDiagnosisError(message, { cause: error });
}

function assertReadOnlySql(sql) {
  const normalized = typeof sql === "string" ? sql.trim() : "";
  if (forbiddenSqlPattern.test(normalized)) {
    throw new OwnerSchemaDiagnosisError("Owner schema diagnosis SQL must be read-only.");
  }
}

async function safeQuery(client, sql, params = []) {
  assertReadOnlySql(sql);
  return client.query(sql, params);
}

function toNumber(value) {
  return Number(value || 0);
}

function foundMap(rows, key, expected) {
  const found = new Set((rows || []).map((row) => row[key]));
  return Object.fromEntries(expected.map((name) => [name, found.has(name)]));
}

async function tableExists(client, tableName) {
  const result = await safeQuery(client, "select to_regclass($1) is not null as exists", [
    `public.${tableName}`
  ]);
  return Boolean(result.rows?.[0]?.exists);
}

async function columnMap(client, tableName, columns) {
  if (!columns?.length) return {};
  const result = await safeQuery(
    client,
    `
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
        and column_name = any($2::text[])
    `,
    [tableName, columns]
  );
  return foundMap(result.rows, "column_name", columns);
}

function allKeysPresent(map, keys) {
  return keys.every((key) => map[key] === true);
}

function accountStatusExpression({ hasAccountStatus, alias = "" }) {
  const prefix = alias ? `${alias}.` : "";
  if (!hasAccountStatus) {
    return `case when ${prefix}status = 'blocked' then 'blocked' else 'active' end`;
  }
  return `coalesce(${prefix}account_status, case when ${prefix}status = 'blocked' then 'blocked' else 'active' end)`;
}

function classifyDiagnosis({ tables, columns, admin, migrationHistory }) {
  const usersCoreReady =
    tables.users &&
    allKeysPresent(columns.users || {}, ["id", "email", "auth_uid", "role", "status"]);
  const currentOwnerSurfaceReady =
    tables.admin_profiles &&
    tables.admin_permission_overrides &&
    allKeysPresent(columns.admin_profiles || {}, expectedColumns.admin_profiles) &&
    allKeysPresent(columns.admin_permission_overrides || {}, [
      "user_id",
      "permission_key",
      "effect",
      "reason"
    ]);

  if (currentOwnerSurfaceReady) {
    if (admin.activeApprovedAdminCount > 0 && admin.activeApprovedOwnerCount < 1) {
      return "CURRENT_OWNER_SCHEMA_WITHOUT_OWNER";
    }
    return "CURRENT_OWNER_SCHEMA_READY";
  }

  if (!usersCoreReady) {
    return "OWNER_SCHEMA_UNSUPPORTED";
  }

  if (!tables.admin_profiles && !tables.admin_permission_overrides) {
    return migrationHistory.relevantMigrationApplied
      ? "OWNER_SCHEMA_LEDGER_MISMATCH"
      : "MISSING_RBAC_OWNER_MIGRATION";
  }

  return "OWNER_SCHEMA_UNSUPPORTED";
}

export async function diagnoseOwnerSchema({ pool, migrationName, migrationChecksum }) {
  if (!pool || typeof pool.connect !== "function") {
    throw new OwnerSchemaDiagnosisError("Owner schema diagnosis requires a transaction-capable pool.");
  }

  const client = await pool.connect();
  try {
    await safeQuery(client, "begin transaction read only");
    const readOnlyState = await safeQuery(
      client,
      "select current_setting('transaction_read_only') as read_only"
    );
    const readOnlyValue = readOnlyState.rows?.[0]?.read_only;
    const readOnlyTransaction = readOnlyValue === "on" || readOnlyValue === true;

    const tables = {};
    for (const tableName of expectedTables) {
      tables[tableName] = await tableExists(client, tableName);
    }

    const columns = {};
    for (const [tableName, columnNames] of Object.entries(expectedColumns)) {
      columns[tableName] = tables[tableName]
        ? await columnMap(client, tableName, columnNames)
        : Object.fromEntries(columnNames.map((columnName) => [columnName, false]));
    }

    const constraints = tables.admin_profiles || tables.admin_permission_overrides
      ? foundMap(
          (
            await safeQuery(
              client,
              `
                select conname
                from pg_constraint
                where connamespace = 'public'::regnamespace
                  and conname = any($1::text[])
              `,
              [expectedConstraints]
            )
          ).rows,
          "conname",
          expectedConstraints
        )
      : Object.fromEntries(expectedConstraints.map((name) => [name, false]));

    const indexes = tables.admin_permission_overrides
      ? foundMap(
          (
            await safeQuery(
              client,
              `
                select indexname
                from pg_indexes
                where schemaname = 'public'
                  and indexname = any($1::text[])
              `,
              [expectedIndexes]
            )
          ).rows,
          "indexname",
          expectedIndexes
        )
      : Object.fromEntries(expectedIndexes.map((name) => [name, false]));

    const triggers = tables.admin_profiles || tables.admin_permission_overrides
      ? foundMap(
          (
            await safeQuery(
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
            )
          ).rows,
          "tgname",
          expectedTriggers
        )
      : Object.fromEntries(expectedTriggers.map((name) => [name, false]));

    let migrationHistory = {
      ledgerTableExists: tables.app_schema_migrations,
      relevantMigrationApplied: false,
      relevantMigrationRowCount: 0,
      relevantMigrationChecksumMatches: false,
      unrelatedMigrationRowCount: 0
    };
    if (tables.app_schema_migrations) {
      const ledger = await safeQuery(
        client,
        `
          select
            count(*) filter (where migration_name = $1)::int as migration_row_count,
            coalesce(bool_or(checksum = $2) filter (where migration_name = $1), false) as checksum_matches,
            count(*) filter (where migration_name <> $1)::int as other_migration_count
          from public.app_schema_migrations
        `,
        [migrationName, migrationChecksum]
      );
      migrationHistory = {
        ledgerTableExists: true,
        relevantMigrationApplied: toNumber(ledger.rows?.[0]?.migration_row_count) > 0,
        relevantMigrationRowCount: toNumber(ledger.rows?.[0]?.migration_row_count),
        relevantMigrationChecksumMatches: Boolean(ledger.rows?.[0]?.checksum_matches),
        unrelatedMigrationRowCount: toNumber(ledger.rows?.[0]?.other_migration_count)
      };
    }

    let admin = {
      activeApprovedAdminCount: 0,
      activeApprovedOwnerCount: 0,
      adminProfileCount: 0,
      permissionOverrideCount: 0
    };
    if (tables.users && columns.users.role && columns.users.status) {
      const unaliasedAccountStatus = accountStatusExpression({
        hasAccountStatus: columns.users.account_status
      });
      const aliasedAccountStatus = accountStatusExpression({
        hasAccountStatus: columns.users.account_status,
        alias: "u"
      });
      const ownerCountExpression = tables.admin_profiles
        ? `
            (
              select count(*)::int
              from public.users u
              join public.admin_profiles ap on ap.user_id = u.id
              where u.role = 'admin'
                and u.status = 'approved'
                and ${aliasedAccountStatus} = 'active'
                and ap.admin_role = 'owner'
            )
          `
        : "0";
      const adminProfileCountExpression = tables.admin_profiles
        ? "(select count(*)::int from public.admin_profiles)"
        : "0";
      const permissionOverrideCountExpression = tables.admin_permission_overrides
        ? "(select count(*)::int from public.admin_permission_overrides)"
        : "0";
      const adminResult = await safeQuery(
        client,
        `
          select
            (
              select count(*)::int
              from public.users
              where role = 'admin'
                and status = 'approved'
                and ${unaliasedAccountStatus} = 'active'
            ) as active_approved_admin_count,
            ${ownerCountExpression} as active_approved_owner_count,
            ${adminProfileCountExpression} as admin_profile_count,
            ${permissionOverrideCountExpression} as permission_override_count
        `
      );
      admin = {
        activeApprovedAdminCount: toNumber(adminResult.rows?.[0]?.active_approved_admin_count),
        activeApprovedOwnerCount: toNumber(adminResult.rows?.[0]?.active_approved_owner_count),
        adminProfileCount: toNumber(adminResult.rows?.[0]?.admin_profile_count),
        permissionOverrideCount: toNumber(adminResult.rows?.[0]?.permission_override_count)
      };
    }

    const category = classifyDiagnosis({ tables, columns, admin, migrationHistory });
    const result = {
      ok: category === "CURRENT_OWNER_SCHEMA_READY",
      category,
      readOnlyTransaction,
      tables,
      columns,
      constraints,
      indexes,
      triggers,
      migrationHistory,
      legacySurface: {
        usersRoleStatusAuthUidReady:
          tables.users &&
          allKeysPresent(columns.users || {}, ["id", "email", "auth_uid", "role", "status"])
      },
      admin
    };

    await safeQuery(client, "commit");
    return result;
  } catch (error) {
    try {
      await safeQuery(client, "rollback");
    } catch {
      // Preserve the original sanitized diagnosis failure.
    }
    throw sanitizeError(error);
  } finally {
    client.release?.();
  }
}
