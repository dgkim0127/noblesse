import path from "node:path";
import { fileURLToPath } from "node:url";
import { getEnv } from "../config/env.js";
import { createPool } from "../db/pool.js";
import { createOwnerSafeRbacSchemaQueries } from "../db/queries/ownerSafeRbacSchemaQueries.js";
import { createOwnerSafeRbacSchemaService } from "../services/ownerSafeRbacSchemaService.js";

const currentFile = fileURLToPath(import.meta.url);

function printSanitized(result) {
  console.log(
    JSON.stringify({
      ok: result.ok === true,
      category: result.category || "UNKNOWN",
      alreadyApplied: result.alreadyApplied === true,
      userLifecycleBackfillCount: Number(result.userLifecycleBackfillCount || 0),
      buyerVerificationBackfillCount: Number(result.buyerVerificationBackfillCount || 0),
      buyerSubmittedBackfillCount: Number(result.buyerSubmittedBackfillCount || 0),
      buyerReviewedBackfillCount: Number(result.buyerReviewedBackfillCount || 0),
      adminProfileCount: Number(result.adminProfileCount || 0),
      permissionOverrideCount: Number(result.permissionOverrideCount || 0),
      ownerCount: Number(result.ownerCount || 0),
      productCount: Number(result.productCount || 0),
      categoryCount: Number(result.categoryCount || 0),
      priceBookCount: Number(result.priceBookCount || 0),
      buyerApprovalUnchanged: result.buyerApprovalUnchanged === true,
      productCatalogUnchanged: result.productCatalogUnchanged === true,
      transactionCommitted: result.transactionCommitted === true
    })
  );
}

export async function main(source = process.env) {
  const env = getEnv(source);
  const pool = createPool(env);
  const service = createOwnerSafeRbacSchemaService({
    source,
    queries: createOwnerSafeRbacSchemaQueries(pool)
  });

  try {
    const result = await service.applyBootstrap();
    printSanitized(result);
    if (!result.ok) process.exitCode = 1;
    return result;
  } finally {
    await pool?.end?.();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  main().catch((error) => {
    console.error(error?.code || error?.name || "OWNER_SAFE_RBAC_BOOTSTRAP_FAILED");
    process.exitCode = 1;
  });
}
