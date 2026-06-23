import {
  getRuntimePrivilegeEntries,
  migrationLedgerTable,
  runtimePrivilegeManifest,
  runtimeRoleName,
  runtimeSchemaName,
  validateRuntimePrivilegeManifest
} from "./runtimePrivilegeManifest.js";

const unsafeErrorPattern =
  /DATABASE_URL|postgres:\/\/|postgresql:\/\/|password|private_key|BEGIN PRIVATE KEY|auth_uid|email|cloudsql|@/i;
const forbiddenMutationPattern =
  /^\s*(insert|update|delete|alter|create|drop|truncate|grant|revoke|comment)\b/i;
const tablePrivileges = ["SELECT", "INSERT", "UPDATE", "DELETE"];

export class RuntimePrivilegeDiagnosisError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "RuntimePrivilegeDiagnosisError";
    this.cause = options.cause;
  }
}

function sanitizeError(error) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (!message || unsafeErrorPattern.test(message)) {
    return new RuntimePrivilegeDiagnosisError("Runtime privilege diagnosis failed.", {
      cause: error
    });
  }
  return new RuntimePrivilegeDiagnosisError(message, { cause: error });
}

function assertReadOnlySql(sql) {
  const normalized = typeof sql === "string" ? sql.trim() : "";
  if (forbiddenMutationPattern.test(normalized)) {
    throw new RuntimePrivilegeDiagnosisError("Runtime privilege diagnosis SQL must be read-only.");
  }
}

async function safeQuery(client, sql, params) {
  assertReadOnlySql(sql);
  return client.query(sql, params);
}

function toNumber(value) {
  return Number(value || 0);
}

function expectedPrivilegeCount() {
  return Object.values(runtimePrivilegeManifest).reduce(
    (total, privileges) => total + privileges.length,
    0
  );
}

function roleAttributesExpected(role) {
  return Boolean(
    role.exists &&
      !role.canLogin &&
      !role.superuser &&
      !role.createDb &&
      !role.createRole &&
      !role.replication &&
      role.inherit &&
      !role.cloudSqlSuperuserMember &&
      role.ownedTableCount === 0 &&
      role.ownedSequenceCount === 0 &&
      role.ownedFunctionCount === 0
  );
}

export function classifyRuntimePrivilegeFailure(result) {
  if (!result?.diagnosticCompleted) {
    return {
      category: "E",
      state: "UNKNOWN",
      reason: "diagnostic did not complete"
    };
  }

  if (!result.tables || !result.runtimeRole || !result.currentSession) {
    return {
      category: "F",
      state: "UNKNOWN",
      reason: "read-only evidence is insufficient"
    };
  }

  if (result.tables.missingTableNames.length > 0) {
    return {
      category: "D",
      state: "PARTIAL_OR_PREEXISTING_UNKNOWN",
      reason: "manifest object is missing"
    };
  }

  const committedStatePresent =
    result.runtimeRole.exists &&
    result.tables.expectedPrivilegeMissingCount === 0 &&
    roleAttributesExpected(result.runtimeRole);

  const rollbackOrNotStarted =
    !result.runtimeRole.exists &&
    result.tables.expectedPrivilegeMissingCount === result.tables.expectedPrivilegeTotal &&
    result.tables.unexpectedPrivilegeCount === 0;

  if (
    committedStatePresent &&
    (result.tables.unexpectedPrivilegeCount > 0 ||
      result.tables.migrationLedgerAccess ||
      result.database.createEffective ||
      result.schema.createEffective ||
      result.database.publicCreate ||
      result.schema.publicCreate)
  ) {
    return {
      category: "A",
      state: "COMMITTED_STATE_PRESENT",
      reason: "committed state is present but effective privileges failed validation"
    };
  }

  if (rollbackOrNotStarted && !result.currentSession.createRole) {
    return {
      category: "C",
      state: "ROLLED_BACK_OR_NOT_STARTED",
      reason: "runtime role is absent and current identity cannot create roles"
    };
  }

  if (
    rollbackOrNotStarted &&
    (!result.currentSession.databaseOwner || !result.currentSession.publicSchemaOwner)
  ) {
    return {
      category: "B",
      state: "ROLLED_BACK_OR_NOT_STARTED",
      reason: "runtime role is absent and ownership authority is incomplete"
    };
  }

  if (rollbackOrNotStarted) {
    return {
      category: "F",
      state: "ROLLED_BACK_OR_NOT_STARTED",
      reason: "runtime role is absent but read-only evidence is insufficient"
    };
  }

  if (result.runtimeRole.exists) {
    return {
      category: "F",
      state: "PARTIAL_OR_PREEXISTING_UNKNOWN",
      reason: "runtime role exists but committed state is incomplete or ambiguous"
    };
  }

  return {
    category: "F",
    state: "UNKNOWN",
    reason: "read-only evidence is insufficient"
  };
}

async function readCurrentSession(client) {
  const result = await safeQuery(
    client,
    `
      select
        true as login,
        coalesce(r.rolcreaterole, false) as create_role,
        coalesce(r.rolcreatedb, false) as create_db,
        coalesce(r.rolsuper, false) as superuser,
        coalesce(r.rolreplication, false) as replication,
        pg_has_role(current_user, 'cloudsqlsuperuser', 'member') as cloudsql_superuser_member,
        exists (
          select 1 from pg_database d
          where d.datname = current_database()
            and pg_get_userbyid(d.datdba) = current_user
        ) as database_owner,
        exists (
          select 1
          from pg_namespace n
          where n.nspname = $1
            and pg_get_userbyid(n.nspowner) = current_user
        ) as public_schema_owner,
        pg_has_role(current_user, 'pg_database_owner', 'member') as pg_database_owner_member
      from pg_roles r
      where r.rolname = current_user
    `,
    [runtimeSchemaName]
  );
  const row = result.rows?.[0] || {};
  return {
    login: Boolean(row.login),
    createRole: Boolean(row.create_role),
    createDb: Boolean(row.create_db),
    superuser: Boolean(row.superuser),
    replication: Boolean(row.replication),
    cloudSqlSuperuserMember: Boolean(row.cloudsql_superuser_member),
    databaseOwner: Boolean(row.database_owner),
    publicSchemaOwner: Boolean(row.public_schema_owner),
    pgDatabaseOwnerMember: Boolean(row.pg_database_owner_member)
  };
}

async function readRuntimeRole(client) {
  const result = await safeQuery(
    client,
    `
      select
        r.rolcanlogin,
        r.rolsuper,
        r.rolcreatedb,
        r.rolcreaterole,
        r.rolreplication,
        r.rolinherit,
        pg_has_role($1, 'cloudsqlsuperuser', 'member') as cloudsql_superuser_member,
        (
          select count(*)::int
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = $2
            and c.relkind in ('r', 'p')
            and pg_get_userbyid(c.relowner) = $1
        ) as owned_table_count,
        (
          select count(*)::int
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = $2
            and c.relkind = 'S'
            and pg_get_userbyid(c.relowner) = $1
        ) as owned_sequence_count,
        (
          select count(*)::int
          from pg_proc p
          join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = $2
            and pg_get_userbyid(p.proowner) = $1
        ) as owned_function_count
      from pg_roles r
      where r.rolname = $1
    `,
    [runtimeRoleName, runtimeSchemaName]
  );
  const row = result.rows?.[0];
  if (!row) {
    return {
      exists: false,
      canLogin: false,
      superuser: false,
      createDb: false,
      createRole: false,
      replication: false,
      inherit: false,
      cloudSqlSuperuserMember: false,
      ownedTableCount: 0,
      ownedSequenceCount: 0,
      ownedFunctionCount: 0,
      attributesExpected: false
    };
  }
  const role = {
    exists: true,
    canLogin: Boolean(row.rolcanlogin),
    superuser: Boolean(row.rolsuper),
    createDb: Boolean(row.rolcreatedb),
    createRole: Boolean(row.rolcreaterole),
    replication: Boolean(row.rolreplication),
    inherit: Boolean(row.rolinherit),
    cloudSqlSuperuserMember: Boolean(row.cloudsql_superuser_member),
    ownedTableCount: toNumber(row.owned_table_count),
    ownedSequenceCount: toNumber(row.owned_sequence_count),
    ownedFunctionCount: toNumber(row.owned_function_count)
  };
  return {
    ...role,
    attributesExpected: roleAttributesExpected(role)
  };
}

async function readDatabaseAndSchemaState(client, runtimeRoleExists) {
  const database = await safeQuery(
    client,
    `
      select
        case when $1::boolean then has_database_privilege($2, current_database(), 'CONNECT') else false end
          as connect_effective,
        case when $1::boolean then has_database_privilege($2, current_database(), 'CREATE') else false end
          as create_effective,
        case when $1::boolean then has_database_privilege($2, current_database(), 'TEMPORARY') else false end
          as temporary_effective,
        (
          select coalesce(bool_or(a.privilege_type = 'CREATE'), false)
          from pg_database d
          left join lateral aclexplode(coalesce(d.datacl, acldefault('d', d.datdba))) a on true
          where d.datname = current_database()
            and a.grantee = 0
        ) as public_create,
        (
          select coalesce(bool_or(a.privilege_type = 'CONNECT'), false)
          from pg_database d
          left join lateral aclexplode(coalesce(d.datacl, acldefault('d', d.datdba))) a on true
          where d.datname = current_database()
            and a.grantee = 0
        ) as public_connect,
        (
          select pg_get_userbyid(d.datdba) = current_user
          from pg_database d
          where d.datname = current_database()
        ) as current_user_is_owner
    `,
    [runtimeRoleExists, runtimeRoleName]
  );
  const schema = await safeQuery(
    client,
    `
      select
        case when $1::boolean then has_schema_privilege($2, $3, 'USAGE') else false end
          as usage_effective,
        case when $1::boolean then has_schema_privilege($2, $3, 'CREATE') else false end
          as create_effective,
        (
          select coalesce(bool_or(a.privilege_type = 'USAGE'), false)
          from pg_namespace n
          left join lateral aclexplode(coalesce(n.nspacl, acldefault('n', n.nspowner))) a on true
          where n.nspname = $3
            and a.grantee = 0
        ) as public_usage,
        (
          select coalesce(bool_or(a.privilege_type = 'CREATE'), false)
          from pg_namespace n
          left join lateral aclexplode(coalesce(n.nspacl, acldefault('n', n.nspowner))) a on true
          where n.nspname = $3
            and a.grantee = 0
        ) as public_create,
        (
          select pg_get_userbyid(n.nspowner) = current_user
          from pg_namespace n
          where n.nspname = $3
        ) as current_user_is_owner
    `,
    [runtimeRoleExists, runtimeRoleName, runtimeSchemaName]
  );
  const databaseRow = database.rows?.[0] || {};
  const schemaRow = schema.rows?.[0] || {};
  return {
    database: {
      connectEffective: Boolean(databaseRow.connect_effective),
      createEffective: Boolean(databaseRow.create_effective),
      temporaryEffective: Boolean(databaseRow.temporary_effective),
      publicCreate: Boolean(databaseRow.public_create),
      publicConnect: Boolean(databaseRow.public_connect),
      currentUserIsOwner: Boolean(databaseRow.current_user_is_owner)
    },
    schema: {
      usageEffective: Boolean(schemaRow.usage_effective),
      createEffective: Boolean(schemaRow.create_effective),
      publicUsage: Boolean(schemaRow.public_usage),
      publicCreate: Boolean(schemaRow.public_create),
      currentUserIsOwner: Boolean(schemaRow.current_user_is_owner)
    }
  };
}

async function readTableState(client, runtimeRoleExists) {
  const expectedEntries = getRuntimePrivilegeEntries();
  const tableNames = expectedEntries.map(({ tableName }) => tableName);
  const existingTables = await safeQuery(
    client,
    `
      select table_name
      from information_schema.tables
      where table_schema = $1
        and table_name = any($2::text[])
    `,
    [runtimeSchemaName, tableNames]
  );
  const existing = new Set((existingTables.rows || []).map((row) => row.table_name));
  const missingTableNames = tableNames.filter((tableName) => !existing.has(tableName));
  const explicitGrants = await safeQuery(
    client,
    `
      select table_name, privilege_type
      from information_schema.table_privileges
      where table_schema = $1
        and grantee = $2
        and table_name = any($3::text[])
    `,
    [runtimeSchemaName, runtimeRoleName, tableNames]
  );
  const explicit = new Set(
    (explicitGrants.rows || []).map((row) => `${row.table_name}.${row.privilege_type}`)
  );

  let expectedPrivilegeMissingCount = 0;
  let unexpectedPrivilegeCount = 0;
  const tablesWithUnexpectedPrivileges = new Set();
  const tablesWithMissingPrivileges = new Set();

  for (const { tableName, privileges } of expectedEntries) {
    const expected = new Set(privileges);
    for (const privilege of tablePrivileges) {
      let effective = false;
      if (runtimeRoleExists && existing.has(tableName)) {
        const check = await safeQuery(
          client,
          "select has_table_privilege($1, $2, $3) as allowed",
          [runtimeRoleName, `${runtimeSchemaName}.${tableName}`, privilege]
        );
        effective = Boolean(check.rows?.[0]?.allowed);
      }
      const explicitlyGranted = explicit.has(`${tableName}.${privilege}`);
      if (expected.has(privilege) && !effective) {
        expectedPrivilegeMissingCount += 1;
        tablesWithMissingPrivileges.add(tableName);
      }
      if (!expected.has(privilege) && (effective || explicitlyGranted)) {
        unexpectedPrivilegeCount += 1;
        tablesWithUnexpectedPrivileges.add(tableName);
      }
    }
  }

  let migrationLedgerAccess = false;
  for (const privilege of tablePrivileges) {
    if (runtimeRoleExists) {
      const check = await safeQuery(
        client,
        "select has_table_privilege($1, $2, $3) as allowed",
        [runtimeRoleName, `${runtimeSchemaName}.${migrationLedgerTable}`, privilege]
      );
      migrationLedgerAccess = migrationLedgerAccess || Boolean(check.rows?.[0]?.allowed);
    }
  }

  return {
    manifestTableCount: expectedEntries.length,
    missingTableNames,
    expectedPrivilegeTotal: expectedPrivilegeCount(),
    expectedPrivilegeMissingCount,
    unexpectedPrivilegeCount,
    tablesWithUnexpectedPrivileges: [...tablesWithUnexpectedPrivileges].sort(),
    tablesWithMissingPrivileges: [...tablesWithMissingPrivileges].sort(),
    migrationLedgerAccess
  };
}

export async function diagnoseRuntimePrivilegeState({ pool, logger } = {}) {
  if (!pool || typeof pool.connect !== "function") {
    throw new RuntimePrivilegeDiagnosisError(
      "Runtime privilege diagnosis requires a transaction-capable pool."
    );
  }
  const manifestValidation = validateRuntimePrivilegeManifest();
  if (!manifestValidation.ok) {
    throw new RuntimePrivilegeDiagnosisError("Runtime privilege manifest is invalid.");
  }

  const client = await pool.connect();
  logger?.info?.("runtime privilege diagnosis started");

  try {
    await safeQuery(client, "begin transaction read only");
    await safeQuery(client, "set local search_path = pg_catalog, public");
    const readOnly = await safeQuery(
      client,
      "select current_setting('transaction_read_only') as read_only"
    );
    const readOnlyValue = readOnly.rows?.[0]?.read_only;
    const readOnlyTransaction = readOnlyValue === "on" || readOnlyValue === true;
    const currentSession = await readCurrentSession(client);
    const runtimeRole = await readRuntimeRole(client);
    const { database, schema } = await readDatabaseAndSchemaState(client, runtimeRole.exists);
    const tables = await readTableState(client, runtimeRole.exists);
    await safeQuery(client, "commit");

    const result = {
      diagnosticCompleted: true,
      readOnlyTransaction,
      dbMutation: false,
      currentSession,
      runtimeRole,
      database,
      schema,
      tables
    };
    result.classification = classifyRuntimePrivilegeFailure(result);
    logger?.info?.("runtime privilege diagnosis completed", {
      category: result.classification.category,
      readOnlyTransaction: result.readOnlyTransaction
    });
    return result;
  } catch (error) {
    try {
      await safeQuery(client, "rollback");
    } catch {
      // Preserve the original sanitized diagnosis failure.
    }
    logger?.error?.("runtime privilege diagnosis failed");
    throw sanitizeError(error);
  } finally {
    client.release?.();
  }
}
