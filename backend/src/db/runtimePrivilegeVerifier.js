import {
  getRuntimePrivilegeEntries,
  migrationLedgerTable,
  runtimeRoleName,
  runtimeSchemaName,
  validateRuntimePrivilegeManifest
} from "./runtimePrivilegeManifest.js";

const unsafeErrorPattern =
  /DATABASE_URL|postgres:\/\/|postgresql:\/\/|password|private_key|BEGIN PRIVATE KEY|auth_uid|email|cloudsql|@/i;

export class RuntimePrivilegeVerificationError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "RuntimePrivilegeVerificationError";
    this.cause = options.cause;
  }
}

function sanitizeError(error) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (!message || unsafeErrorPattern.test(message)) {
    return new RuntimePrivilegeVerificationError("Runtime privilege verification failed.", {
      cause: error
    });
  }
  return new RuntimePrivilegeVerificationError(message, { cause: error });
}

function toNumber(value) {
  return Number(value || 0);
}

function collectFailedChecks(result) {
  const failed = [];
  if (!result.readOnlyTransaction) failed.push("readOnlyTransaction");
  if (!result.identity.runtimeRoleMember) failed.push("identity.runtimeRoleMember");
  if (result.identity.cloudSqlSuperuserMember) failed.push("identity.cloudSqlSuperuserMember");
  if (result.identity.superuser) failed.push("identity.superuser");
  if (result.identity.createRole) failed.push("identity.createRole");
  if (result.identity.createDb) failed.push("identity.createDb");
  if (result.identity.replication) failed.push("identity.replication");
  if (result.ownership.applicationTableCount !== 0) {
    failed.push("ownership.applicationTableCount");
  }
  if (result.ownership.sequenceCount !== 0) failed.push("ownership.sequenceCount");
  if (result.ownership.functionCount !== 0) failed.push("ownership.functionCount");
  if (!result.database.connect) failed.push("database.connect");
  if (!result.schema.usage) failed.push("schema.usage");
  if (result.database.create) failed.push("database.create");
  if (result.schema.create) failed.push("schema.create");
  if (result.expectedPrivilegeMissingCount !== 0) {
    failed.push("expectedPrivilegeMissingCount");
  }
  if (result.unexpectedPrivilegeCount !== 0) failed.push("unexpectedPrivilegeCount");
  if (result.migrationLedgerAccess) failed.push("migrationLedgerAccess");
  if (result.adminOptionMembershipCount !== 0) failed.push("adminOptionMembershipCount");
  return failed;
}

async function safeQuery(client, sql, params) {
  return client.query(sql, params);
}

export async function verifyRuntimePrivileges({ pool, logger } = {}) {
  if (!pool || typeof pool.connect !== "function") {
    throw new RuntimePrivilegeVerificationError(
      "Runtime verifier requires a transaction-capable pool."
    );
  }

  const manifestValidation = validateRuntimePrivilegeManifest();
  if (!manifestValidation.ok) {
    throw new RuntimePrivilegeVerificationError("Runtime privilege manifest is invalid.");
  }

  const client = await pool.connect();
  logger?.info?.("runtime privilege verification started");

  try {
    await safeQuery(client, "begin transaction read only");
    await safeQuery(client, "set local search_path = pg_catalog, public");

    const readOnly = await safeQuery(
      client,
      "select current_setting('transaction_read_only') as read_only"
    );
    const readOnlyValue = readOnly.rows?.[0]?.read_only;
    const readOnlyTransaction = readOnlyValue === "on" || readOnlyValue === true;

    const identity = await safeQuery(
      client,
      `
        select
          pg_has_role(current_user, $1, 'member') as runtime_role_member,
          pg_has_role(current_user, 'cloudsqlsuperuser', 'member') as cloudsql_superuser_member,
          r.rolsuper,
          r.rolcreatedb,
          r.rolcreaterole,
          r.rolreplication
        from pg_roles r
        where r.rolname = current_user
      `,
      [runtimeRoleName]
    );
    const identityRow = identity.rows?.[0] || {};

    const ownership = await safeQuery(
      client,
      `
        select
          (
            select count(*)::int
            from pg_class c
            join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = $1
              and c.relkind in ('r', 'p')
              and pg_get_userbyid(c.relowner) = current_user
          ) as application_table_count,
          (
            select count(*)::int
            from pg_class c
            join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = $1
              and c.relkind = 'S'
              and pg_get_userbyid(c.relowner) = current_user
          ) as sequence_count,
          (
            select count(*)::int
            from pg_proc p
            join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = $1
              and pg_get_userbyid(p.proowner) = current_user
          ) as function_count
      `,
      [runtimeSchemaName]
    );
    const ownershipRow = ownership.rows?.[0] || {};

    const database = await safeQuery(
      client,
      `
        select
          has_database_privilege(current_database(), 'CONNECT') as connect,
          has_database_privilege(current_database(), 'CREATE') as create
      `
    );
    const schema = await safeQuery(
      client,
      `
        select
          has_schema_privilege($1, 'USAGE') as usage,
          has_schema_privilege($1, 'CREATE') as create
      `,
      [runtimeSchemaName]
    );

    const expectedPrivileges = new Map(
      getRuntimePrivilegeEntries().map(({ tableName, privileges }) => [
        tableName,
        new Set(privileges)
      ])
    );
    const allPrivileges = ["SELECT", "INSERT", "UPDATE", "DELETE"];
    let expectedPrivilegeMissingCount = 0;
    let unexpectedPrivilegeCount = 0;
    for (const [tableName, expected] of expectedPrivileges.entries()) {
      for (const privilege of allPrivileges) {
        const check = await safeQuery(
          client,
          "select has_table_privilege($1, $2) as allowed",
          [`${runtimeSchemaName}.${tableName}`, privilege]
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
        "select has_table_privilege($1, $2) as allowed",
        [`${runtimeSchemaName}.${migrationLedgerTable}`, privilege]
      );
      migrationLedgerAccess = migrationLedgerAccess || Boolean(check.rows?.[0]?.allowed);
    }

    const adminOption = await safeQuery(
      client,
      `
        select count(*)::int as admin_option_membership_count
        from pg_auth_members m
        join pg_roles member_role on member_role.oid = m.member
        where member_role.rolname = current_user
          and m.admin_option = true
      `
    );

    await safeQuery(client, "commit");

    const result = {
      ok: false,
      readOnlyTransaction,
      identity: {
        runtimeRoleMember: Boolean(identityRow.runtime_role_member),
        cloudSqlSuperuserMember: Boolean(identityRow.cloudsql_superuser_member),
        superuser: Boolean(identityRow.rolsuper),
        createRole: Boolean(identityRow.rolcreaterole),
        createDb: Boolean(identityRow.rolcreatedb),
        replication: Boolean(identityRow.rolreplication)
      },
      ownership: {
        applicationTableCount: toNumber(ownershipRow.application_table_count),
        sequenceCount: toNumber(ownershipRow.sequence_count),
        functionCount: toNumber(ownershipRow.function_count)
      },
      database: {
        connect: Boolean(database.rows?.[0]?.connect),
        create: Boolean(database.rows?.[0]?.create)
      },
      schema: {
        usage: Boolean(schema.rows?.[0]?.usage),
        create: Boolean(schema.rows?.[0]?.create)
      },
      expectedPrivilegeMissingCount,
      unexpectedPrivilegeCount,
      migrationLedgerAccess,
      adminOptionMembershipCount: toNumber(
        adminOption.rows?.[0]?.admin_option_membership_count
      )
    };
    result.failedChecks = collectFailedChecks(result);
    result.ok = result.failedChecks.length === 0;
    logger?.info?.("runtime privilege verification completed", {
      ok: result.ok,
      failedCheckCount: result.failedChecks.length
    });
    return result;
  } catch (error) {
    try {
      await safeQuery(client, "rollback");
    } catch {
      // Preserve the original sanitized verifier failure.
    }
    logger?.error?.("runtime privilege verification failed");
    throw sanitizeError(error);
  } finally {
    client.release?.();
  }
}
