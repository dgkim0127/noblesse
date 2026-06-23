import {
  getRuntimePrivilegeEntries,
  migrationLedgerTable,
  runtimeDatabaseName,
  runtimeRoleName,
  runtimeSchemaName,
  validateRuntimePrivilegeManifest
} from "./runtimePrivilegeManifest.js";

const unsafeErrorPattern =
  /DATABASE_URL|postgres:\/\/|postgresql:\/\/|password|private_key|BEGIN PRIVATE KEY|auth_uid|email|cloudsql|@/i;
const tablePrivileges = ["SELECT", "INSERT", "UPDATE", "DELETE"];

export class RuntimePrivilegeHardeningError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "RuntimePrivilegeHardeningError";
    this.cause = options.cause;
    this.failedChecks = options.failedChecks || [];
    this.transactionCommitted = Boolean(options.transactionCommitted);
  }
}

function sanitizeError(error) {
  if (error instanceof RuntimePrivilegeHardeningError) return error;
  const message = error instanceof Error ? error.message : String(error || "");
  if (!message || unsafeErrorPattern.test(message)) {
    return new RuntimePrivilegeHardeningError("Runtime privilege hardening failed.", {
      cause: error
    });
  }
  return new RuntimePrivilegeHardeningError(message, { cause: error });
}

function quoteIdent(identifier) {
  if (!/^[a-z_][a-z0-9_]*$/.test(identifier)) {
    throw new RuntimePrivilegeHardeningError("Unsafe fixed identifier.");
  }
  return `"${identifier}"`;
}

function tableIdent(tableName) {
  return `${quoteIdent(runtimeSchemaName)}.${quoteIdent(tableName)}`;
}

function tableRef(tableName) {
  return `${runtimeSchemaName}.${tableName}`;
}

async function safeQuery(client, sql, params) {
  return client.query(sql, params);
}

function toNumber(value) {
  return Number(value || 0);
}

function assertExpectedRoleAttributes(roleRow) {
  if (!roleRow) return;
  const unsafe =
    roleRow.rolcanlogin ||
    roleRow.rolsuper ||
    roleRow.rolcreatedb ||
    roleRow.rolcreaterole ||
    roleRow.rolreplication ||
    !roleRow.rolinherit;
  if (unsafe) {
    throw new RuntimePrivilegeHardeningError("Existing runtime role has unsafe attributes.", {
      failedChecks: ["role.attributes"]
    });
  }
}

async function readExistingRole(client) {
  const result = await safeQuery(
    client,
    `
      select rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolinherit
      from pg_roles
      where rolname = $1
    `,
    [runtimeRoleName]
  );
  return result.rows?.[0] || null;
}

async function inspectRuntimePrivilegeAuthority(client) {
  const currentSessionResult = await safeQuery(
    client,
    `
      select
        coalesce(r.rolcreaterole, false) as create_role,
        coalesce(r.rolcreatedb, false) as create_db,
        coalesce(r.rolsuper, false) as superuser,
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
        ) as schema_owner
      from pg_roles r
      where r.rolname = current_user
    `,
    [runtimeSchemaName]
  );
  const session = currentSessionResult.rows?.[0] || {};

  const databaseResult = await safeQuery(
    client,
    `
      select
        (
          select coalesce(bool_or(a.privilege_type = 'CONNECT'), false)
          from pg_database d
          left join lateral aclexplode(coalesce(d.datacl, acldefault('d', d.datdba))) a on true
          where d.datname = current_database()
            and a.grantee = 0
        ) as public_connect,
        (
          select coalesce(bool_or(a.privilege_type = 'CREATE'), false)
          from pg_database d
          left join lateral aclexplode(coalesce(d.datacl, acldefault('d', d.datdba))) a on true
          where d.datname = current_database()
            and a.grantee = 0
        ) as public_create
    `
  );
  const schemaResult = await safeQuery(
    client,
    `
      select
        (
          select coalesce(bool_or(a.privilege_type = 'USAGE'), false)
          from pg_namespace n
          left join lateral aclexplode(coalesce(n.nspacl, acldefault('n', n.nspowner))) a on true
          where n.nspname = $1
            and a.grantee = 0
        ) as public_usage,
        (
          select coalesce(bool_or(a.privilege_type = 'CREATE'), false)
          from pg_namespace n
          left join lateral aclexplode(coalesce(n.nspacl, acldefault('n', n.nspowner))) a on true
          where n.nspname = $1
            and a.grantee = 0
        ) as public_create
    `,
    [runtimeSchemaName]
  );

  const tableAuthority = [];
  for (const { tableName, privileges } of getRuntimePrivilegeEntries()) {
    const authorityResult = await safeQuery(
      client,
      `
        select
          to_regclass($1) is not null as exists,
          exists (
            select 1
            from pg_class c
            join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = $2
              and c.relname = $3
              and pg_get_userbyid(c.relowner) = current_user
          ) as current_user_is_owner,
          case when to_regclass($1) is null then false else has_table_privilege(current_user, $1, 'SELECT WITH GRANT OPTION') end
            as select_grant_option,
          case when to_regclass($1) is null then false else has_table_privilege(current_user, $1, 'INSERT WITH GRANT OPTION') end
            as insert_grant_option,
          case when to_regclass($1) is null then false else has_table_privilege(current_user, $1, 'UPDATE WITH GRANT OPTION') end
            as update_grant_option,
          case when to_regclass($1) is null then false else has_table_privilege(current_user, $1, 'DELETE WITH GRANT OPTION') end
            as delete_grant_option,
          (
            select coalesce(count(*), 0)::int
            from pg_class c
            join pg_namespace n on n.oid = c.relnamespace
            join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a on true
            where n.nspname = $2
              and c.relname = $3
              and a.grantee = 0
              and a.privilege_type = any($4::text[])
          ) as public_overgrant_count
      `,
      [tableRef(tableName), runtimeSchemaName, tableName, tablePrivileges]
    );
    const row = authorityResult.rows?.[0] || {};
    const grantOptions = {
      SELECT: Boolean(row.select_grant_option),
      INSERT: Boolean(row.insert_grant_option),
      UPDATE: Boolean(row.update_grant_option),
      DELETE: Boolean(row.delete_grant_option)
    };
    tableAuthority.push({
      tableName,
      exists: Boolean(row.exists),
      currentUserIsOwner: Boolean(row.current_user_is_owner),
      expectedPrivileges: [...privileges],
      grantOptions,
      publicOvergrantCount: toNumber(row.public_overgrant_count)
    });
  }

  const databaseRow = databaseResult.rows?.[0] || {};
  const schemaRow = schemaResult.rows?.[0] || {};
  return {
    currentSession: {
      canCreateRole: Boolean(session.create_role),
      canCreateDb: Boolean(session.create_db),
      superuser: Boolean(session.superuser),
      cloudSqlSuperuserMember: Boolean(session.cloudsql_superuser_member),
      databaseOwner: Boolean(session.database_owner),
      schemaOwner: Boolean(session.schema_owner)
    },
    database: {
      publicConnect: Boolean(databaseRow.public_connect),
      publicCreate: Boolean(databaseRow.public_create),
      stateAlreadySafe: Boolean(databaseRow.public_connect && !databaseRow.public_create),
      mutationAuthority: Boolean(session.database_owner)
    },
    schema: {
      publicUsage: Boolean(schemaRow.public_usage),
      publicCreate: Boolean(schemaRow.public_create),
      stateAlreadySafe: Boolean(schemaRow.public_usage && !schemaRow.public_create),
      mutationAuthority: Boolean(session.schema_owner)
    },
    tables: tableAuthority
  };
}

function buildRuntimeHardeningPlan(authorityState) {
  const failedChecks = [];
  if (!authorityState.currentSession.canCreateRole) failedChecks.push("authority.createRole");

  const databaseAclMutationRequired = !authorityState.database.stateAlreadySafe;
  const schemaAclMutationRequired = !authorityState.schema.stateAlreadySafe;
  if (authorityState.database.publicCreate) failedChecks.push("database.publicCreate");
  if (authorityState.schema.publicCreate) failedChecks.push("schema.publicCreate");
  if (databaseAclMutationRequired && !authorityState.database.mutationAuthority) {
    failedChecks.push("authority.databaseAcl");
  }
  if (schemaAclMutationRequired && !authorityState.schema.mutationAuthority) {
    failedChecks.push("authority.schemaAcl");
  }

  let tableGrantAuthorityMissingCount = 0;
  let publicTableOvergrantCount = 0;
  const missingTables = [];
  for (const table of authorityState.tables) {
    if (!table.exists) {
      missingTables.push(table.tableName);
      continue;
    }
    publicTableOvergrantCount += table.publicOvergrantCount;
    for (const privilege of table.expectedPrivileges) {
      if (!table.currentUserIsOwner && !table.grantOptions[privilege]) {
        tableGrantAuthorityMissingCount += 1;
      }
    }
  }
  if (missingTables.length > 0) failedChecks.push("manifest.missingTables");
  if (tableGrantAuthorityMissingCount > 0) failedChecks.push("authority.tableGrant");
  if (publicTableOvergrantCount > 0) failedChecks.push("tables.publicOvergrant");

  return {
    ok: failedChecks.length === 0,
    failedChecks,
    databaseAclMutationRequired,
    schemaAclMutationRequired,
    databaseStateAlreadySafe: authorityState.database.stateAlreadySafe,
    schemaStateAlreadySafe: authorityState.schema.stateAlreadySafe,
    publicPrivilegeUsed:
      authorityState.database.publicConnect ||
      authorityState.schema.publicUsage ||
      authorityState.tables.some((table) => table.publicOvergrantCount > 0),
    tableGrantAuthorityMissingCount,
    missingTables,
    publicTableOvergrantCount
  };
}

function collectFailedChecks(result, { requireCommit = true } = {}) {
  const failed = [];
  if (!result.role.present) failed.push("role.present");
  if (result.role.canLogin) failed.push("role.canLogin");
  if (result.role.superuser) failed.push("role.superuser");
  if (result.role.createRole) failed.push("role.createRole");
  if (result.role.createDb) failed.push("role.createDb");
  if (result.role.replication) failed.push("role.replication");
  if (!result.role.inherit) failed.push("role.inherit");
  if (!result.database.connect) failed.push("database.connect");
  if (result.database.create) failed.push("database.create");
  if (!result.schema.usage) failed.push("schema.usage");
  if (result.schema.create) failed.push("schema.create");
  if (result.migrationLedgerAccess) failed.push("migrationLedgerAccess");
  if (result.expectedPrivilegeMissingCount !== 0) failed.push("expectedPrivilegeMissingCount");
  if (result.unexpectedPrivilegeCount !== 0) failed.push("unexpectedPrivilegeCount");
  if (requireCommit && !result.transactionCommitted) failed.push("transactionCommitted");
  return failed;
}

async function verifyRuntimePrivileges(client, transactionCommitted = false) {
  const expectedPrivileges = new Map(
    getRuntimePrivilegeEntries().map(({ tableName, privileges }) => [
      tableName,
      new Set(privileges)
    ])
  );
  const allPrivileges = tablePrivileges;
  const roleCheck = await safeQuery(
    client,
    `
      select rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolinherit
      from pg_roles
      where rolname = $1
    `,
    [runtimeRoleName]
  );
  const roleRow = roleCheck.rows?.[0] || {};
  const databaseCheck = await safeQuery(
    client,
    `
      select
        has_database_privilege($1, $2, 'CONNECT') as connect,
        has_database_privilege($1, $2, 'CREATE') as create
    `,
    [runtimeRoleName, runtimeDatabaseName]
  );
  const schemaCheck = await safeQuery(
    client,
    `
      select
        has_schema_privilege($1, $2, 'USAGE') as usage,
        has_schema_privilege($1, $2, 'CREATE') as create
    `,
    [runtimeRoleName, runtimeSchemaName]
  );

  let expectedPrivilegeMissingCount = 0;
  let unexpectedPrivilegeCount = 0;
  for (const [tableName, expected] of expectedPrivileges.entries()) {
    for (const privilege of allPrivileges) {
      const check = await safeQuery(
        client,
        "select has_table_privilege($1, $2, $3) as allowed",
        [runtimeRoleName, `${runtimeSchemaName}.${tableName}`, privilege]
      );
      const allowed = Boolean(check.rows?.[0]?.allowed);
      if (expected.has(privilege) && !allowed) expectedPrivilegeMissingCount += 1;
      if (!expected.has(privilege) && allowed) unexpectedPrivilegeCount += 1;
    }
  }

  let migrationLedgerAccess = false;
  for (const privilege of allPrivileges) {
    const check = await safeQuery(
      client,
      "select has_table_privilege($1, $2, $3) as allowed",
      [runtimeRoleName, `${runtimeSchemaName}.${migrationLedgerTable}`, privilege]
    );
    migrationLedgerAccess = migrationLedgerAccess || Boolean(check.rows?.[0]?.allowed);
  }

  const result = {
    ok: false,
    role: {
      present: Boolean(roleCheck.rows?.[0]),
      canLogin: Boolean(roleRow.rolcanlogin),
      superuser: Boolean(roleRow.rolsuper),
      createDb: Boolean(roleRow.rolcreatedb),
      createRole: Boolean(roleRow.rolcreaterole),
      replication: Boolean(roleRow.rolreplication),
      inherit: Boolean(roleRow.rolinherit)
    },
    database: {
      connect: Boolean(databaseCheck.rows?.[0]?.connect),
      create: Boolean(databaseCheck.rows?.[0]?.create)
    },
    schema: {
      usage: Boolean(schemaCheck.rows?.[0]?.usage),
      create: Boolean(schemaCheck.rows?.[0]?.create)
    },
    expectedPrivilegeMissingCount,
    unexpectedPrivilegeCount,
    migrationLedgerAccess,
    transactionCommitted
  };
  result.failedChecks = collectFailedChecks(result, { requireCommit: transactionCommitted });
  result.ok = result.failedChecks.length === 0;
  return result;
}

export { buildRuntimeHardeningPlan, inspectRuntimePrivilegeAuthority };

export async function hardenRuntimePrivileges({ pool, logger } = {}) {
  if (!pool || typeof pool.connect !== "function") {
    throw new RuntimePrivilegeHardeningError("Runtime hardener requires a transaction-capable pool.");
  }

  const manifestValidation = validateRuntimePrivilegeManifest();
  if (!manifestValidation.ok) {
    throw new RuntimePrivilegeHardeningError("Runtime privilege manifest is invalid.");
  }

  const client = await pool.connect();
  logger?.info?.("runtime privilege hardening started");

  try {
    await safeQuery(client, "begin");
    await safeQuery(client, "set local search_path = pg_catalog, public");

    logger?.info?.("runtime privilege hardening preflight started");
    const authorityState = await inspectRuntimePrivilegeAuthority(client);
    const hardeningPlan = buildRuntimeHardeningPlan(authorityState);
    if (!hardeningPlan.ok) {
      throw new RuntimePrivilegeHardeningError("Runtime privilege authority preflight failed.", {
        failedChecks: hardeningPlan.failedChecks
      });
    }
    logger?.info?.("runtime privilege authority preflight passed");

    const existingRole = await readExistingRole(client);
    assertExpectedRoleAttributes(existingRole);

    let roleCreated = false;
    if (!existingRole) {
      await safeQuery(
        client,
        `create role ${quoteIdent(runtimeRoleName)} nologin nosuperuser nocreatedb nocreaterole noreplication inherit`
      );
      roleCreated = true;
    }
    await safeQuery(
      client,
      `alter role ${quoteIdent(runtimeRoleName)} set search_path = pg_catalog, public`
    );
    logger?.info?.("runtime role configured", { roleCreated });

    let databaseAclMutationExecuted = false;
    if (hardeningPlan.databaseAclMutationRequired) {
      await safeQuery(
        client,
        `grant connect on database ${quoteIdent(runtimeDatabaseName)} to ${quoteIdent(runtimeRoleName)}`
      );
      databaseAclMutationExecuted = true;
    }

    let schemaAclMutationExecuted = false;
    if (hardeningPlan.schemaAclMutationRequired) {
      await safeQuery(
        client,
        `grant usage on schema ${quoteIdent(runtimeSchemaName)} to ${quoteIdent(runtimeRoleName)}`
      );
      schemaAclMutationExecuted = true;
    }

    const shouldConvergeExistingRole = Boolean(existingRole);
    if (shouldConvergeExistingRole) {
      await safeQuery(
        client,
        `revoke SELECT, INSERT, UPDATE, DELETE on ${tableIdent(migrationLedgerTable)} from ${quoteIdent(runtimeRoleName)}`
      );
    }

    for (const { tableName, privileges } of getRuntimePrivilegeEntries()) {
      if (shouldConvergeExistingRole) {
        await safeQuery(
          client,
          `revoke SELECT, INSERT, UPDATE, DELETE on ${tableIdent(tableName)} from ${quoteIdent(runtimeRoleName)}`
        );
      }
      if (privileges.length > 0) {
        await safeQuery(
          client,
          `grant ${privileges.join(", ")} on ${tableIdent(tableName)} to ${quoteIdent(runtimeRoleName)}`
        );
      }
    }
    logger?.info?.("runtime table privileges applied");

    const verificationResult = await verifyRuntimePrivileges(client, false);
    if (!verificationResult.ok) {
      throw new RuntimePrivilegeHardeningError("Runtime privilege verification failed.", {
        failedChecks: verificationResult.failedChecks
      });
    }
    logger?.info?.("runtime privilege verification passed");

    await safeQuery(client, "commit");
    const result = {
      ...verificationResult,
      ok: true,
      transactionCommitted: true,
      databaseAclMutationExecuted,
      schemaAclMutationExecuted,
      publicPrivilegeUsed: hardeningPlan.publicPrivilegeUsed,
      roleCreated,
      failedChecks: []
    };
    logger?.info?.("runtime privilege hardening committed", {
      ok: result.ok,
      failedCheckCount: 0,
      databaseAclMutationExecuted,
      schemaAclMutationExecuted,
      publicPrivilegeUsed: result.publicPrivilegeUsed,
      roleCreated
    });
    return result;
  } catch (error) {
    try {
      await safeQuery(client, "rollback");
      logger?.info?.("runtime privilege hardening rolled back");
    } catch {
      // Preserve the original sanitized hardening failure.
    }
    logger?.error?.("runtime privilege hardening failed");
    throw sanitizeError(error);
  } finally {
    client.release?.();
  }
}
