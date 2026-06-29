import { createPool } from "../db/pool.js";
import { createAdminFxQueries } from "../db/queries/adminFxQueries.js";
import { getEnv } from "../config/env.js";
import { createAdminFxService } from "../services/adminFxService.js";
import { getFxProviderSnapshot } from "../fx/fxProvider.js";
import { createFxProviderResultLog } from "../fx/fxObservability.js";

export function assertFxRateFetchAllowed(env = process.env) {
  if (env.ALLOW_FX_RATE_FETCH_JOB !== "true") {
    throw new Error("FX rate fetch job is disabled. Set ALLOW_FX_RATE_FETCH_JOB=true.");
  }
}

export async function runFxRateSnapshotImport({ env = process.env, pool, fetchImpl = globalThis.fetch, now, logger = console.log } = {}) {
  assertFxRateFetchAllowed(env);
  const provider = env.FX_PROVIDER || "manual";
  if (provider === "manual" && !env.FX_MANUAL_PAYLOAD_JSON) {
    throw new Error("FX_MANUAL_PAYLOAD_JSON is required for manual FX import.");
  }
  let providerRequestCount = 0;
  const countedFetch = async (...args) => {
    providerRequestCount += 1;
    return fetchImpl(...args);
  };

  const effectivePool = pool || createPool(getEnv());
  const service = createAdminFxService({
    queries: createAdminFxQueries(effectivePool)
  });
  const snapshot = await getFxProviderSnapshot({
    provider,
    payload: env.FX_MANUAL_PAYLOAD_JSON,
    env,
    fetchImpl: countedFetch,
    now
  });
  const providerLog = createFxProviderResultLog(snapshot, {
    mode: "production",
    providerRequestCount,
    env,
    now,
    dbInitialized: true
  });
  logger(JSON.stringify(providerLog));
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
    auditLogIdReturned: Boolean(result.auditLogId),
    providerResult: providerLog
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
