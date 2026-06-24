import { createPool } from "../db/pool.js";
import { createAdminFxQueries } from "../db/queries/adminFxQueries.js";
import { getEnv } from "../config/env.js";
import { createAdminFxService } from "../services/adminFxService.js";

export function assertFxRateFetchAllowed(env = process.env) {
  if (env.ALLOW_FX_RATE_FETCH_JOB !== "true") {
    throw new Error("FX rate fetch job is disabled. Set ALLOW_FX_RATE_FETCH_JOB=true.");
  }
}

export async function runFxRateSnapshotImport({ env = process.env, pool } = {}) {
  assertFxRateFetchAllowed(env);
  if (env.FX_PROVIDER !== "manual") {
    throw new Error("Live FX provider fetch is not approved. Use manual payload import or approve provider selection.");
  }
  if (!env.FX_MANUAL_PAYLOAD_JSON) {
    throw new Error("FX_MANUAL_PAYLOAD_JSON is required for manual FX import.");
  }

  const effectivePool = pool || createPool(getEnv());
  const service = createAdminFxService({
    queries: createAdminFxQueries(effectivePool)
  });
  const result = await service.importRates(
    { payload: JSON.parse(env.FX_MANUAL_PAYLOAD_JSON) },
    {
      userId: null,
      role: "system",
      requestId: "fx-rate-fetch-job",
      userAgent: "fx-rate-fetch-job"
    }
  );

  return {
    insertedCount: result.insertedCount,
    auditLogIdReturned: Boolean(result.auditLogId)
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runFxRateSnapshotImport()
    .then((result) => {
      console.log(JSON.stringify({
        status: "completed",
        insertedCount: result.insertedCount,
        auditLogIdReturned: result.auditLogIdReturned
      }));
    })
    .catch((error) => {
      console.error(JSON.stringify({
        status: "failed",
        category: error?.message || "FX_RATE_FETCH_FAILED"
      }));
      process.exitCode = 1;
    });
}
