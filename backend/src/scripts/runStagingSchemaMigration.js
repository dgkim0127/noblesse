import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getEnv } from "../config/env.js";
import { createPool } from "../db/pool.js";
import { runSchemaMigration } from "../db/schemaMigrationRunner.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const repoRoot = path.resolve(currentDir, "../../..");
const defaultSchemaPath = path.join(repoRoot, "supabase", "schema.sql");

export function assertRunnerAllowed(source = process.env) {
  if (source.ALLOW_STAGING_SCHEMA_MIGRATION_RUNNER !== "true") {
    throw new Error("Staging schema migration runner is disabled.");
  }
}

export function resolveSchemaSqlPath(source = process.env) {
  const candidate = source.SCHEMA_SQL_PATH
    ? path.resolve(repoRoot, source.SCHEMA_SQL_PATH)
    : defaultSchemaPath;

  const relative = path.relative(repoRoot, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("SCHEMA_SQL_PATH must stay inside the repository.");
  }

  return candidate;
}

export async function loadSchemaSql(source = process.env) {
  const schemaPath = resolveSchemaSqlPath(source);
  return fs.readFile(schemaPath, "utf8");
}

export async function main(source = process.env) {
  assertRunnerAllowed(source);

  const env = getEnv(source);
  const pool = createPool(env);
  const sqlText = await loadSchemaSql(source);

  try {
    return await runSchemaMigration({
      pool,
      sqlText,
      migrationName: "staging-schema",
      logger: console
    });
  } finally {
    await pool?.end?.();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  main().catch((error) => {
    console.error(error.message || "Staging schema migration runner failed.");
    process.exitCode = 1;
  });
}
