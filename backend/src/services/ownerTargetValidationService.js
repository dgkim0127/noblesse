const USER_NOT_FOUND_CODES = new Set(["auth/user-not-found", "user-not-found"]);
const approvedTargetAccountType = "operator-controlled production admin account";
const approvedPasswordRotationStatuses = new Set(["completed", "pending_after_recovery"]);

function cleanIdentifier(value) {
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

function isUnsafeTargetIdentifier(identifier) {
  return /(^|[^a-z0-9])(canary|n56|prod[-_]?uat|production[-_]?uat|staging|testbuyer)([^a-z0-9]|$)/i.test(
    identifier
  );
}

function hasPasswordInput(source = {}) {
  return [
    source.TARGET_OWNER_PASSWORD,
    source.OWNER_PASSWORD,
    source.NOBLESSE_OWNER_PASSWORD
  ].some((value) => value !== undefined && value !== null && String(value) !== "");
}

export function validateOwnerTargetValidationEnv(source = process.env) {
  if (source.NOBLESSE_OWNER_TARGET_VALIDATION_ALLOW !== "YES") {
    return { ok: false, category: "TARGET_VALIDATION_NOT_ALLOWED" };
  }
  if (!hasProductionRuntimeMarker(source)) {
    return { ok: false, category: "NON_PRODUCTION_RUNTIME" };
  }
  if (hasPasswordInput(source)) {
    return { ok: false, category: "PASSWORD_INPUT_REJECTED" };
  }

  const targetIdentifier = cleanIdentifier(source.TARGET_OWNER_IDENTIFIER);
  if (!targetIdentifier) {
    return { ok: false, category: "MISSING_TARGET_IDENTIFIER" };
  }
  if (targetIdentifier.length > 254 || /[\s"'`]/.test(targetIdentifier)) {
    return { ok: false, category: "INVALID_TARGET_IDENTIFIER" };
  }
  if (isUnsafeTargetIdentifier(targetIdentifier)) {
    return { ok: false, category: "UNSAFE_OWNER_TARGET" };
  }

  const targetAccountType = String(source.TARGET_ACCOUNT_TYPE || "").trim();
  if (targetAccountType !== approvedTargetAccountType) {
    return { ok: false, category: "UNSAFE_OWNER_TARGET" };
  }
  if (source.CANARY_ACCOUNT_USED !== "NO") {
    return { ok: false, category: "UNSAFE_OWNER_TARGET" };
  }

  const passwordRotationStatus = String(source.PASSWORD_ROTATION_STATUS || "").trim();
  if (!approvedPasswordRotationStatuses.has(passwordRotationStatus)) {
    return { ok: false, category: "PASSWORD_ROTATION_REQUIRED" };
  }

  return {
    ok: true,
    targetIdentifier,
    targetAccountType,
    passwordRotationStatus
  };
}

function isFirebaseUserNotFound(error) {
  return USER_NOT_FOUND_CODES.has(error?.code);
}

function sanitized(result = {}) {
  return {
    ok: result.ok === true,
    category: result.category || "UNKNOWN",
    targetFound: result.targetFound === true,
    targetUnique: result.targetUnique === true,
    targetEligible: result.targetEligible === true,
    targetCurrentlyOwner: result.targetCurrentlyOwner === true,
    adminFirebaseUserFound: result.adminFirebaseUserFound === true,
    firebaseUserEnabled: result.firebaseUserEnabled === true,
    readOnlyTransaction: result.readOnlyTransaction === true
  };
}

export function createOwnerTargetValidationService({ firebaseUserLookup, queries, source }) {
  return {
    async validateTarget() {
      const env = validateOwnerTargetValidationEnv(source);
      if (!env.ok) return sanitized({ ok: false, category: env.category });

      const targetResult = await queries.validateTarget({ identifier: env.targetIdentifier });
      if (!targetResult.ok) return sanitized(targetResult);

      try {
        const firebaseUser = await firebaseUserLookup.getUserByEmail(targetResult.target.email);
        if (!firebaseUser?.uid) {
          return sanitized({ ...targetResult, ok: false, category: "ADMIN_FIREBASE_USER_NOT_FOUND" });
        }
        if (firebaseUser.disabled === true) {
          return sanitized({
            ...targetResult,
            ok: false,
            category: "ADMIN_FIREBASE_USER_DISABLED",
            adminFirebaseUserFound: true,
            firebaseUserEnabled: false
          });
        }
      } catch (error) {
        if (isFirebaseUserNotFound(error)) {
          return sanitized({ ...targetResult, ok: false, category: "ADMIN_FIREBASE_USER_NOT_FOUND" });
        }
        throw error;
      }

      return sanitized({
        ...targetResult,
        adminFirebaseUserFound: true,
        firebaseUserEnabled: true
      });
    }
  };
}
