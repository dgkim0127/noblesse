import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getEnv } from "../config/env.js";
import { createPool } from "../db/pool.js";
import { verifyRbacSchema } from "../db/rbacSchemaVerifier.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const backendRoot = path.resolve(currentDir, "../..");
const expectedMigrationPath = "migrations/20260622_admin_rbac_account_lifecycle.sql";
const expectedMigrationName = "20260622_admin_rbac_account_lifecycle";

export function assertVerifierAllowed(source = process.env) {
  if (source.ALLOW_STAGING_RBAC_VERIFICATION !== "true") {
    throw new Error("Staging RBAC verification runner is disabled.");
  }
}

export function resolveRbacMigrationPath(source = process.env) {
  const requested = source.RBAC_MIGRATION_PATH || expectedMigrationPath;
  if (requested !== expectedMigrationPath) {
    throw new Error("RBAC_MIGRATION_PATH must use the packaged lifecycle migration.");
  }

  const resolved = path.resolve(backendRoot, requested);
  const relative = path.relative(backendRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("RBAC_MIGRATION_PATH must stay inside the backend package.");
  }

  return resolved;
}

function toReportResult(result) {
  return {
    ok: result.ok,
    readOnlyTransaction: result.readOnlyTransaction,
    migrationLedger: result.migrationLedger,
    schema: {
      tablesValid: result.schema.tablesValid,
      columnsValid: result.schema.columnsValid,
      constraintsValid: result.schema.constraintsValid,
      indexesValid: result.schema.indexesValid,
      triggersValid: result.schema.triggersValid
    },
    lifecycle: result.lifecycle,
    admins: result.admins,
    overrides: result.overrides,
    failedChecks: result.failedChecks
  };
}

export async function main(source = process.env) {
  assertVerifierAllowed(source);

  const env = getEnv(source);
  const pool = createPool(env);
  const migrationSqlText = await fs.readFile(resolveRbacMigrationPath(source), "utf8");

  try {
    const result = await verifyRbacSchema({
      pool,
      migrationSqlText,
      migrationName: expectedMigrationName,
      logger: console
    });
    return toReportResult(result);
  } finally {
    await pool?.end?.();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  main()
    .then((result) => {
      console.log(JSON.stringify(result));
      if (!result.ok) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error.message || "Staging RBAC verification failed.");
      process.exitCode = 1;
    });
}
