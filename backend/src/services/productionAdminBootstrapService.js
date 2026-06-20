const USER_NOT_FOUND_CODES = new Set(["auth/user-not-found", "user-not-found"]);

function cleanEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function hasProductionRuntimeMarker(source = {}) {
  const markers = [
    source.NOBLESSE_RUNTIME_ENV,
    source.NOBLESSE_ENV,
    source.APP_ENV,
    source.CLOUD_RUN_JOB,
    source.K_SERVICE,
    source.GAE_SERVICE
  ]
    .map((value) => String(value || "").toLowerCase())
    .filter(Boolean);

  return markers.some((value) => value === "production" || value.includes("prod"));
}

export function validateProductionAdminBootstrapEnv(source = process.env) {
  if (source.NOBLESSE_PRODUCTION_ADMIN_BOOTSTRAP_ALLOW !== "YES") {
    return { ok: false, category: "BOOTSTRAP_NOT_ALLOWED" };
  }

  if (!hasProductionRuntimeMarker(source)) {
    return { ok: false, category: "NON_PRODUCTION_RUNTIME" };
  }

  const adminEmail = cleanEmail(source.NOBLESSE_PROD_ADMIN_EMAIL);
  if (!adminEmail) {
    return { ok: false, category: "MISSING_EMAIL_INPUT" };
  }

  return {
    ok: true,
    adminEmail
  };
}

function isFirebaseUserNotFound(error) {
  return USER_NOT_FOUND_CODES.has(error?.code);
}

function toSanitizedResult(result = {}) {
  return {
    ok: result.ok === true,
    category: result.category || "UNKNOWN",
    adminFirebaseUserFound: result.adminFirebaseUserFound === true,
    adminReady: result.adminReady === true,
    adminAlreadyReady: result.adminAlreadyReady === true,
    transactionCommitted: result.transactionCommitted === true
  };
}

export function createProductionAdminBootstrapService({ firebaseUserLookup, queries, source }) {
  return {
    async bootstrap() {
      const envCheck = validateProductionAdminBootstrapEnv(source);
      if (!envCheck.ok) {
        return toSanitizedResult({
          ok: false,
          category: envCheck.category
        });
      }

      let adminFirebaseUser;
      try {
        adminFirebaseUser = await firebaseUserLookup.getUserByEmail(envCheck.adminEmail);
      } catch (error) {
        if (isFirebaseUserNotFound(error)) {
          return toSanitizedResult({
            ok: false,
            category: "ADMIN_FIREBASE_USER_NOT_FOUND"
          });
        }
        throw error;
      }

      if (!adminFirebaseUser?.uid) {
        return toSanitizedResult({
          ok: false,
          category: "ADMIN_FIREBASE_USER_NOT_FOUND"
        });
      }

      const result = await queries.bootstrapAdmin({
        adminIdentity: {
          authUid: adminFirebaseUser.uid,
          email: envCheck.adminEmail
        }
      });

      return toSanitizedResult({
        adminFirebaseUserFound: true,
        ...result
      });
    }
  };
}
