const USER_NOT_FOUND_CODES = new Set(["auth/user-not-found", "user-not-found"]);

function cleanEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function hasStagingRuntimeMarker(source = {}) {
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

  return markers.some((value) => value.includes("staging"));
}

export function validateStagingBootstrapEnv(source = process.env) {
  if (source.NOBLESSE_STAGING_BOOTSTRAP_ALLOW !== "YES") {
    return { ok: false, category: "BOOTSTRAP_NOT_ALLOWED" };
  }

  if (!hasStagingRuntimeMarker(source)) {
    return { ok: false, category: "NON_STAGING_RUNTIME" };
  }

  const adminEmail = cleanEmail(source.NOBLESSE_STAGING_ADMIN_EMAIL);
  const buyerEmail = cleanEmail(source.NOBLESSE_STAGING_BUYER_EMAIL);
  const adminOnly = source.NOBLESSE_STAGING_ADMIN_ONLY === "YES";
  if (!adminEmail || (!adminOnly && !buyerEmail)) {
    return { ok: false, category: "MISSING_EMAIL_INPUT" };
  }

  if (!adminOnly && adminEmail === buyerEmail) {
    return { ok: false, category: "IDENTICAL_EMAILS_REJECTED" };
  }

  return {
    ok: true,
    adminEmail,
    buyerEmail: adminOnly ? "" : buyerEmail,
    adminOnly
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
    buyerRegistered: result.buyerRegistered === true,
    adminReady: result.adminReady === true,
    ownerReady: result.ownerReady === true,
    buyerApproved: result.buyerApproved === true,
    adminAlreadyReady: result.adminAlreadyReady === true,
    buyerAlreadyApproved: result.buyerAlreadyApproved === true
  };
}

export function createStagingE2eBootstrapService({ firebaseUserLookup, queries, source }) {
  return {
    async bootstrap() {
      const envCheck = validateStagingBootstrapEnv(source);
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

      if (envCheck.adminOnly) {
        const adminResult = await queries.bootstrapAdmin({
          adminIdentity: {
            authUid: adminFirebaseUser.uid,
            email: envCheck.adminEmail
          }
        });

        return toSanitizedResult({
          adminFirebaseUserFound: true,
          ...adminResult
        });
      }

      const result = await queries.bootstrapAccounts({
        adminIdentity: {
          authUid: adminFirebaseUser.uid,
          email: envCheck.adminEmail
        },
        buyerEmail: envCheck.buyerEmail
      });

      return toSanitizedResult({
        adminFirebaseUserFound: true,
        ...result
      });
    }
  };
}
