import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFirebaseUserLookup } from "../auth/firebaseAuth.js";
import { getEnv } from "../config/env.js";
import { createPool } from "../db/pool.js";
import { createOwnerAdminRecoveryQueries } from "../db/queries/ownerAdminRecoveryQueries.js";
import { createOwnerAdminRecoveryService } from "../services/ownerAdminRecoveryService.js";

const currentFile = fileURLToPath(import.meta.url);

function printSanitized(result) {
  console.log(
    JSON.stringify({
      ok: result.ok === true,
      category: result.category || "UNKNOWN",
      targetFound: result.targetFound === true,
      targetUnique: result.targetUnique === true,
      targetEligible: result.targetEligible === true,
      adminFirebaseUserFound: result.adminFirebaseUserFound === true,
      firebaseUserEnabled: result.firebaseUserEnabled === true,
      ownerReady: result.ownerReady === true,
      ownerAlreadyReady: result.ownerAlreadyReady === true,
      explicitAdminsManageGrant: result.explicitAdminsManageGrant === true,
      catalogWriteGranted: result.catalogWriteGranted === true,
      otherPermissionsGranted: result.otherPermissionsGranted === true,
      auditLogged: result.auditLogged === true,
      transactionCommitted: result.transactionCommitted === true
    })
  );
}

export async function main(source = process.env) {
  const env = getEnv(source);
  const pool = createPool(env);
  const service = createOwnerAdminRecoveryService({
    source,
    firebaseUserLookup: createFirebaseUserLookup(env),
    queries: createOwnerAdminRecoveryQueries(pool)
  });

  try {
    const result = await service.recoverOwner();
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
    console.error(error?.code || error?.name || "OWNER_ADMIN_RECOVERY_FAILED");
    process.exitCode = 1;
  });
}
