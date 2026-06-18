const unsafeErrorPattern =
  /DATABASE_URL|postgres:\/\/|postgresql:\/\/|password|private_key|BEGIN PRIVATE KEY/i;

export class SchemaMigrationError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "SchemaMigrationError";
    this.cause = options.cause;
  }
}

function sanitizeError(error, fallbackMessage) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (!message || unsafeErrorPattern.test(message)) {
    return new SchemaMigrationError(fallbackMessage, { cause: error });
  }
  return new SchemaMigrationError(message, { cause: error });
}

function estimateStatements(sqlText) {
  return sqlText
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean).length;
}

export function validateMigrationSql(sqlText) {
  if (typeof sqlText !== "string" || sqlText.trim().length === 0) {
    throw new SchemaMigrationError("Migration SQL is empty.");
  }

  const transactionControlPattern =
    /^\s*(begin\s*;|commit\s*;|rollback\s*;|start\s+transaction\s*;?)\s*(?:--.*)?$/im;

  if (transactionControlPattern.test(sqlText)) {
    throw new SchemaMigrationError(
      "Migration SQL must not include transaction-control statements."
    );
  }

  return true;
}

export function buildMigrationPlan({ sqlText, migrationName = "schema" }) {
  validateMigrationSql(sqlText);
  return {
    migrationName,
    sqlLength: sqlText.length,
    statementCountEstimate: estimateStatements(sqlText),
    transactionManagedByRunner: true
  };
}

export async function runSchemaMigration({
  pool,
  sqlText,
  migrationName = "schema",
  logger
}) {
  const plan = buildMigrationPlan({ sqlText, migrationName });

  if (!pool || typeof pool.connect !== "function") {
    throw new SchemaMigrationError("Migration runner requires a transaction-capable pool.");
  }

  const client = await pool.connect();
  logger?.info?.("schema migration started", {
    migrationName: plan.migrationName,
    statementCountEstimate: plan.statementCountEstimate
  });

  try {
    await client.query("begin");
    await client.query(sqlText);
    await client.query("commit");

    const result = {
      executed: true,
      migrationName: plan.migrationName,
      statementCountEstimate: plan.statementCountEstimate,
      transaction: "committed"
    };

    logger?.info?.("schema migration committed", result);
    return result;
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // Preserve the original migration error instead of masking it.
    }
    logger?.error?.("schema migration failed", { migrationName: plan.migrationName });
    throw sanitizeError(error, "Schema migration failed.");
  } finally {
    client.release?.();
  }
}
