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

export class RuntimePrivilegeHardeningError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "RuntimePrivilegeHardeningError";
    this.cause = options.cause;
  }
}

function sanitizeError(error) {
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

async function safeQuery(client, sql, params) {
  return client.query(sql, params);
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
    throw new RuntimePrivilegeHardeningError("Existing runtime role has unsafe attributes.");
  }
}

function collectFailedChecks(result) {
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
  if (!result.transactionCommitted) failed.push("transactionCommitted");
  return failed;
}

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

    const existingRole = await safeQuery(
      client,
      `
        select rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolinherit
        from pg_roles
        where rolname = $1
      `,
      [runtimeRoleName]
    );
    assertExpectedRoleAttributes(existingRole.rows?.[0]);

    if (!existingRole.rows?.[0]) {
      await safeQuery(
        client,
        `create role ${quoteIdent(runtimeRoleName)} nologin nosuperuser nocreatedb nocreaterole noreplication inherit`
      );
    }

    await safeQuery(
      client,
      `alter role ${quoteIdent(runtimeRoleName)} nologin nosuperuser nocreatedb nocreaterole noreplication inherit`
    );
    await safeQuery(
      client,
      `grant connect on database ${quoteIdent(runtimeDatabaseName)} to ${quoteIdent(runtimeRoleName)}`
    );
    await safeQuery(
      client,
      `revoke create on database ${quoteIdent(runtimeDatabaseName)} from ${quoteIdent(runtimeRoleName)}`
    );
    await safeQuery(
      client,
      `grant usage on schema ${quoteIdent(runtimeSchemaName)} to ${quoteIdent(runtimeRoleName)}`
    );
    await safeQuery(
      client,
      `revoke create on schema ${quoteIdent(runtimeSchemaName)} from ${quoteIdent(runtimeRoleName)}`
    );

    const expectedPrivileges = new Map(
      getRuntimePrivilegeEntries().map(({ tableName, privileges }) => [
        tableName,
        new Set(privileges)
      ])
    );
    const allPrivileges = ["SELECT", "INSERT", "UPDATE", "DELETE"];

    await safeQuery(
      client,
      `revoke SELECT, INSERT, UPDATE, DELETE on ${tableIdent(migrationLedgerTable)} from ${quoteIdent(runtimeRoleName)}`
    );

    for (const { tableName, privileges } of getRuntimePrivilegeEntries()) {
      await safeQuery(
        client,
        `revoke SELECT, INSERT, UPDATE, DELETE on ${tableIdent(tableName)} from ${quoteIdent(runtimeRoleName)}`
      );
      if (privileges.length > 0) {
        await safeQuery(
          client,
          `grant ${privileges.join(", ")} on ${tableIdent(tableName)} to ${quoteIdent(runtimeRoleName)}`
        );
      }
    }

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

    await safeQuery(client, "commit");

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
      transactionCommitted: true
    };
    result.failedChecks = collectFailedChecks(result);
    result.ok = result.failedChecks.length === 0;
    logger?.info?.("runtime privilege hardening completed", {
      ok: result.ok,
      failedCheckCount: result.failedChecks.length
    });
    return result;
  } catch (error) {
    try {
      await safeQuery(client, "rollback");
    } catch {
      // Preserve the original sanitized hardening failure.
    }
    logger?.error?.("runtime privilege hardening failed");
    throw sanitizeError(error);
  } finally {
    client.release?.();
  }
}
