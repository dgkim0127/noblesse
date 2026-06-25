import { createPool } from "../db/pool.js";
import { createAdminFxQueries } from "../db/queries/adminFxQueries.js";
import { getEnv } from "../config/env.js";
import { createAdminFxService } from "../services/adminFxService.js";
import { getFxProviderSnapshot } from "../fx/fxProvider.js";

export function assertFxRateFetchAllowed(env = process.env) {
  if (env.ALLOW_FX_RATE_FETCH_JOB !== "true") {
    throw new Error("FX rate fetch job is disabled. Set ALLOW_FX_RATE_FETCH_JOB=true.");
  }
}

export async function runFxRateSnapshotImport({ env = process.env, pool, fetchImpl, now } = {}) {
  assertFxRateFetchAllowed(env);
  const provider = env.FX_PROVIDER || "manual";
  if (provider === "manual" && !env.FX_MANUAL_PAYLOAD_JSON) {
    throw new Error("FX_MANUAL_PAYLOAD_JSON is required for manual FX import.");
  }

  const effectivePool = pool || createPool(getEnv());
  const service = createAdminFxService({
    queries: createAdminFxQueries(effectivePool)
  });
  const snapshot = await getFxProviderSnapshot({
    provider,
    payload: env.FX_MANUAL_PAYLOAD_JSON,
    env,
    fetchImpl,
    now
  });
  const result = await service.importProviderSnapshot(
    snapshot,
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
