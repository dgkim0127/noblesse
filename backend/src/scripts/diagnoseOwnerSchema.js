import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { getEnv } from "../config/env.js";
import { createPool } from "../db/pool.js";
import {
  diagnoseOwnerSchema,
  validateOwnerSchemaDiagnosisEnv
} from "../db/ownerSchemaDiagnosis.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const backendRoot = path.resolve(currentDir, "../..");
const rbacMigrationPath = path.join(
  backendRoot,
  "migrations",
  "20260622_admin_rbac_account_lifecycle.sql"
);
const rbacMigrationName = "20260622_admin_rbac_account_lifecycle";

export function assertDiagnosisAllowed(source = process.env) {
  const result = validateOwnerSchemaDiagnosisEnv(source);
  if (!result.ok) {
    throw new Error(`Owner schema diagnosis disabled: ${result.category}`);
  }
}

function migrationChecksum(sqlText) {
  return createHash("sha256").update(sqlText, "utf8").digest("hex");
}

function summarizeResult(result) {
  return {
    ok: result.ok === true,
    category: result.category,
    readOnlyTransaction: result.readOnlyTransaction === true,
    tables: result.tables,
    columns: result.columns,
    constraints: result.constraints,
    indexes: result.indexes,
    triggers: result.triggers,
    migrationHistory: result.migrationHistory,
    legacySurface: result.legacySurface,
    admin: result.admin
  };
}

export async function main(source = process.env) {
  assertDiagnosisAllowed(source);

  const env = getEnv(source);
  const pool = createPool(env);
  const migrationSql = await fs.readFile(rbacMigrationPath, "utf8");

  try {
    const result = await diagnoseOwnerSchema({
      pool,
      migrationName: rbacMigrationName,
      migrationChecksum: migrationChecksum(migrationSql)
    });
    return summarizeResult(result);
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
      console.error(error?.message || "Owner schema diagnosis failed.");
      process.exitCode = 1;
    });
}
