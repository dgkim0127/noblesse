import path from "node:path";
import { fileURLToPath } from "node:url";
import { getEnv } from "../config/env.js";
import { createPool } from "../db/pool.js";
import { verifyRuntimePrivileges } from "../db/runtimePrivilegeVerifier.js";

const currentFile = fileURLToPath(import.meta.url);

export function assertRuntimeVerificationAllowed(source = process.env) {
  if (source.ALLOW_STAGING_RUNTIME_PRIVILEGE_VERIFICATION !== "true") {
    throw new Error("Staging runtime privilege verification runner is disabled.");
  }
}

function toReportResult(result) {
  return {
    ok: result.ok,
    readOnlyTransaction: result.readOnlyTransaction,
    identity: result.identity,
    ownership: result.ownership,
    database: result.database,
    schema: result.schema,
    expectedPrivilegeMissingCount: result.expectedPrivilegeMissingCount,
    unexpectedPrivilegeCount: result.unexpectedPrivilegeCount,
    migrationLedgerAccess: result.migrationLedgerAccess,
    adminOptionMembershipCount: result.adminOptionMembershipCount,
    failedChecks: result.failedChecks
  };
}

export async function main(source = process.env) {
  assertRuntimeVerificationAllowed(source);

  const env = getEnv(source);
  const pool = createPool(env);

  try {
    const result = await verifyRuntimePrivileges({
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
      console.error(error.message || "Staging runtime privilege verification failed.");
      process.exitCode = 1;
    });
}
