import { createPool } from "../db/pool.js";
import { createAdminFxQueries } from "../db/queries/adminFxQueries.js";
import { getEnv } from "../config/env.js";
import { createAdminFxService } from "../services/adminFxService.js";

export function assertFxReviewAllowed(env = process.env) {
  if (env.ALLOW_FX_REVIEW_JOB !== "true") {
    throw new Error("FX review job is disabled. Set ALLOW_FX_REVIEW_JOB=true.");
  }
}

export async function runFxReview({ env = process.env, pool } = {}) {
  assertFxReviewAllowed(env);
  const effectivePool = pool || createPool(getEnv());
  const service = createAdminFxService({
    queries: createAdminFxQueries(effectivePool)
  });
  const result = await service.createReviewRun(
    {
      thresholdBps: Number(env.FX_REVIEW_THRESHOLD_BPS || 200),
      maxRateAgeHours: Number(env.FX_MAX_RATE_AGE_HOURS || 72)
    },
    {
      userId: null,
      role: "system",
      requestId: "fx-review-job",
      userAgent: "fx-review-job"
    }
  );

  return {
    reviewRunCreated: Boolean(result.reviewRun?.id),
    draftCount: result.reviewRun?.draftCount ?? 0,
    auditLogIdReturned: Boolean(result.auditLogId)
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runFxReview()
    .then((result) => {
      console.log(JSON.stringify({
        status: "completed",
        reviewRunCreated: result.reviewRunCreated,
        draftCount: result.draftCount,
        auditLogIdReturned: result.auditLogIdReturned
      }));
    })
    .catch((error) => {
      console.error(JSON.stringify({
        status: "failed",
        category: error?.message || "FX_REVIEW_FAILED"
      }));
      process.exitCode = 1;
    });
}
