import path from "node:path";
import { fileURLToPath } from "node:url";
import { getEnv } from "../config/env.js";
import { createPool } from "../db/pool.js";
import { diagnoseRuntimePrivilegeState } from "../db/runtimePrivilegeDiagnosis.js";

const currentFile = fileURLToPath(import.meta.url);

export function assertRuntimeDiagnosisAllowed(source = process.env) {
  if (source.ALLOW_STAGING_RUNTIME_PRIVILEGE_DIAGNOSIS !== "true") {
    throw new Error("Staging runtime privilege diagnosis runner is disabled.");
  }
}

function toReportResult(result) {
  return {
    diagnosticCompleted: result.diagnosticCompleted,
    readOnlyTransaction: result.readOnlyTransaction,
    dbMutation: result.dbMutation,
    currentSession: result.currentSession,
    runtimeRole: result.runtimeRole,
    database: result.database,
    schema: result.schema,
    tables: result.tables,
    classification: result.classification
  };
}

export async function main(source = process.env) {
  assertRuntimeDiagnosisAllowed(source);
  const env = getEnv(source);
  const pool = createPool(env);

  try {
    const result = await diagnoseRuntimePrivilegeState({
      pool,
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
      if (!result.diagnosticCompleted || !result.readOnlyTransaction) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error.message || "Staging runtime privilege diagnosis failed.");
      process.exitCode = 1;
    });
}
