import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFirebaseUserLookup } from "../auth/firebaseAuth.js";
import { getEnv } from "../config/env.js";
import { createPool } from "../db/pool.js";
import { createOwnerTargetValidationQueries } from "../db/queries/ownerTargetValidationQueries.js";
import { createOwnerTargetValidationService } from "../services/ownerTargetValidationService.js";

const currentFile = fileURLToPath(import.meta.url);

function printSanitized(result) {
  console.log(JSON.stringify(result));
}

export async function main(source = process.env) {
  const env = getEnv(source);
  const pool = createPool(env);
  const service = createOwnerTargetValidationService({
    source,
    firebaseUserLookup: createFirebaseUserLookup(env),
    queries: createOwnerTargetValidationQueries(pool)
  });

  try {
    const result = await service.validateTarget();
    printSanitized(result);
    if (!result.ok) process.exitCode = 1;
    return result;
  } finally {
    await pool?.end?.();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  main().catch((error) => {
    console.error(error?.code || error?.name || "OWNER_TARGET_VALIDATION_FAILED");
    process.exitCode = 1;
  });
}
