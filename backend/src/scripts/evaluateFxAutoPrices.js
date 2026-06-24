import { getEnv } from "../config/env.js";
import { createPool } from "../db/pool.js";
import { createAdminFxQueries } from "../db/queries/adminFxQueries.js";
import { getFxAutoThresholds } from "../fx/fxAutoPriceEngine.js";
import { createAdminFxService } from "../services/adminFxService.js";

export function assertFxAutoPriceJobAllowed(env = process.env) {
  if (env.ALLOW_FX_AUTO_PRICE_JOB !== "true") {
    throw new Error("FX auto price job is disabled. Set ALLOW_FX_AUTO_PRICE_JOB=true.");
  }
}

export async function runFxAutoPriceEvaluation({ env = process.env, pool } = {}) {
  assertFxAutoPriceJobAllowed(env);
  const effectivePool = pool || createPool(getEnv());
  const service = createAdminFxService({
    queries: createAdminFxQueries(effectivePool)
  });
  const thresholds = getFxAutoThresholds({
    updateThresholdBps: env.FX_AUTO_UPDATE_THRESHOLD_BPS,
    circuitBreakerBps: env.FX_AUTO_CIRCUIT_BREAKER_BPS,
    maxRateAgeHours: env.FX_MAX_RATE_AGE_HOURS
  });
  const result = await service.evaluateAll(thresholds, {
    userId: null,
    role: "system",
    requestId: "fx-auto-price-job",
    userAgent: "fx-auto-price-job"
  });

  return {
    runCreated: Boolean(result.run?.id),
    evaluatedCount: result.run?.evaluatedCount ?? 0,
    createdCount: result.run?.createdCount ?? 0,
    updatedCount: result.run?.updatedCount ?? 0,
    heldCount: result.run?.heldCount ?? 0,
    blockedCount: result.run?.blockedCount ?? 0,
    errorCount: result.run?.errorCount ?? 0,
    auditLogIdReturned: Boolean(result.auditLogId)
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runFxAutoPriceEvaluation()
    .then((result) => {
      console.log(JSON.stringify({
        status: "completed",
        runCreated: result.runCreated,
        evaluatedCount: result.evaluatedCount,
        createdCount: result.createdCount,
        updatedCount: result.updatedCount,
        heldCount: result.heldCount,
        blockedCount: result.blockedCount,
        errorCount: result.errorCount,
        auditLogIdReturned: result.auditLogIdReturned
      }));
    })
    .catch((error) => {
      console.error(JSON.stringify({
        status: "failed",
        category: error?.message || "FX_AUTO_PRICE_EVALUATION_FAILED"
      }));
      process.exitCode = 1;
    });
}
