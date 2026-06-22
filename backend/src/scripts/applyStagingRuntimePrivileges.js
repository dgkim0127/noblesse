import path from "node:path";
import { fileURLToPath } from "node:url";
import { getEnv } from "../config/env.js";
import { createPool } from "../db/pool.js";
import { hardenRuntimePrivileges } from "../db/runtimePrivilegeHardener.js";

const currentFile = fileURLToPath(import.meta.url);

export function assertRuntimeHardeningAllowed(source = process.env) {
  if (source.ALLOW_STAGING_RUNTIME_PRIVILEGE_HARDENING !== "true") {
    throw new Error("Staging runtime privilege hardening runner is disabled.");
  }
}

function toReportResult(result) {
  return {
    ok: result.ok,
    role: result.role,
    database: result.database,
    schema: result.schema,
    expectedPrivilegeMissingCount: result.expectedPrivilegeMissingCount,
    unexpectedPrivilegeCount: result.unexpectedPrivilegeCount,
    migrationLedgerAccess: result.migrationLedgerAccess,
    transactionCommitted: result.transactionCommitted,
    failedChecks: result.failedChecks
  };
}

export async function main(source = process.env) {
  assertRuntimeHardeningAllowed(source);

  const env = getEnv(source);
  const pool = createPool(env);

  try {
    const result = await hardenRuntimePrivileges({
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
      if (!result.ok) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error.message || "Staging runtime privilege hardening failed.");
      process.exitCode = 1;
    });
}
