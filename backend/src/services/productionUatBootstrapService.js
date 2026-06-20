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

export function validateProductionUatBootstrapEnv(source = process.env) {
  if (source.NOBLESSE_PRODUCTION_UAT_BOOTSTRAP_ALLOW !== "YES") {
    return { ok: false, category: "BOOTSTRAP_NOT_ALLOWED" };
  }

  if (!hasProductionRuntimeMarker(source)) {
    return { ok: false, category: "NON_PRODUCTION_RUNTIME" };
  }

  const adminEmail = cleanEmail(source.NOBLESSE_PROD_UAT_ADMIN_EMAIL);
  const buyerEmail = cleanEmail(source.NOBLESSE_PROD_UAT_BUYER_EMAIL);
  if (!adminEmail || !buyerEmail) {
    return { ok: false, category: "MISSING_EMAIL_INPUT" };
  }

  if (adminEmail === buyerEmail) {
    return { ok: false, category: "IDENTICAL_EMAILS_REJECTED" };
  }

  return {
    ok: true,
    adminEmail,
    buyerEmail
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
    buyerFirebaseUserFound: result.buyerFirebaseUserFound === true,
    adminReady: result.adminReady === true,
    buyerReady: result.buyerReady === true,
    buyerProfileReady: result.buyerProfileReady === true,
    adminAlreadyReady: result.adminAlreadyReady === true,
    buyerAlreadyReady: result.buyerAlreadyReady === true
  };
}

export function createProductionUatBootstrapService({ firebaseUserLookup, queries, source }) {
  return {
    async bootstrap() {
      const envCheck = validateProductionUatBootstrapEnv(source);
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

      let buyerFirebaseUser;
      try {
        buyerFirebaseUser = await firebaseUserLookup.getUserByEmail(envCheck.buyerEmail);
      } catch (error) {
        if (isFirebaseUserNotFound(error)) {
          return toSanitizedResult({
            ok: false,
            category: "BUYER_FIREBASE_USER_NOT_FOUND",
            adminFirebaseUserFound: Boolean(adminFirebaseUser?.uid)
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

      if (!buyerFirebaseUser?.uid) {
        return toSanitizedResult({
          ok: false,
          category: "BUYER_FIREBASE_USER_NOT_FOUND",
          adminFirebaseUserFound: true
        });
      }

      const result = await queries.bootstrapAccounts({
        adminIdentity: {
          authUid: adminFirebaseUser.uid,
          email: envCheck.adminEmail
        },
        buyerIdentity: {
          authUid: buyerFirebaseUser.uid,
          email: envCheck.buyerEmail
        }
      });

      return toSanitizedResult({
        adminFirebaseUserFound: true,
        buyerFirebaseUserFound: true,
        ...result
      });
    }
  };
}
