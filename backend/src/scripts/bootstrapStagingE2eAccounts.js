import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFirebaseUserLookup } from "../auth/firebaseAuth.js";
import { getEnv } from "../config/env.js";
import { createPool } from "../db/pool.js";
import { createStagingE2eBootstrapQueries } from "../db/queries/stagingE2eBootstrapQueries.js";
import { createStagingE2eBootstrapService } from "../services/stagingE2eBootstrapService.js";

const currentFile = fileURLToPath(import.meta.url);

function printSanitized(result) {
  console.log(
    JSON.stringify({
      ok: result.ok === true,
      category: result.category || "UNKNOWN",
      adminFirebaseUserFound: result.adminFirebaseUserFound === true,
      buyerRegistered: result.buyerRegistered === true,
      adminReady: result.adminReady === true,
      buyerApproved: result.buyerApproved === true,
      adminAlreadyReady: result.adminAlreadyReady === true,
      buyerAlreadyApproved: result.buyerAlreadyApproved === true
    })
  );
}

export async function main(source = process.env) {
  const env = getEnv(source);
  const pool = createPool(env);
  const service = createStagingE2eBootstrapService({
    source,
    firebaseUserLookup: createFirebaseUserLookup(env),
    queries: createStagingE2eBootstrapQueries(pool)
  });

  try {
    const result = await service.bootstrap();
    printSanitized(result);
    if (!result.ok) {
      process.exitCode = 1;
    }
    return result;
  } finally {
    await pool?.end?.();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  main().catch((error) => {
    console.error(error?.code || error?.name || "BOOTSTRAP_FAILED");
    process.exitCode = 1;
  });
}
