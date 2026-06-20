import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFirebaseUserLookup } from "../auth/firebaseAuth.js";
import { getEnv } from "../config/env.js";
import { createPool } from "../db/pool.js";
import { createProductionAdminBootstrapQueries } from "../db/queries/productionAdminBootstrapQueries.js";
import { createProductionAdminBootstrapService } from "../services/productionAdminBootstrapService.js";

const currentFile = fileURLToPath(import.meta.url);

function printSanitized(result) {
  console.log(
    JSON.stringify({
      ok: result.ok === true,
      category: result.category || "UNKNOWN",
      adminFirebaseUserFound: result.adminFirebaseUserFound === true,
      adminReady: result.adminReady === true,
      adminAlreadyReady: result.adminAlreadyReady === true,
      transactionCommitted: result.transactionCommitted === true
    })
  );
}

export async function main(source = process.env) {
  const env = getEnv(source);
  const pool = createPool(env);
  const service = createProductionAdminBootstrapService({
    source,
    firebaseUserLookup: createFirebaseUserLookup(env),
    queries: createProductionAdminBootstrapQueries(pool)
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
    console.error(error?.code || error?.name || "PRODUCTION_ADMIN_BOOTSTRAP_FAILED");
    process.exitCode = 1;
  });
}
