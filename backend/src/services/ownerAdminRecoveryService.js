const USER_NOT_FOUND_CODES = new Set(["auth/user-not-found", "user-not-found"]);

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

function isUnsafeCanaryIdentifier(identifier) {
  return /(^|[^a-z0-9])(canary|n56|prod[-_]?uat|production[-_]?uat|staging|testbuyer|testadmin)([^a-z0-9]|$)/i.test(
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

export function validateOwnerAdminRecoveryEnv(source = process.env) {
  if (source.NOBLESSE_OWNER_ADMIN_RECOVERY_ALLOW !== "YES") {
    return { ok: false, category: "RECOVERY_NOT_ALLOWED" };
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
  if (isUnsafeCanaryIdentifier(targetIdentifier)) {
    return { ok: false, category: "UNSAFE_OWNER_TARGET" };
  }

  const recoveryReason = String(
    source.RECOVERY_REASON || "owner_recovery_for_catalog_permission_bootstrap"
  ).trim();
  if (!recoveryReason || recoveryReason.length > 120 || /password|token|secret|database_url/i.test(recoveryReason)) {
    return { ok: false, category: "INVALID_RECOVERY_REASON" };
  }

  return {
    ok: true,
    targetIdentifier,
    recoveryReason
  };
}

function isFirebaseUserNotFound(error) {
  return USER_NOT_FOUND_CODES.has(error?.code);
}

function toSanitizedResult(result = {}) {
  return {
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
  };
}

export function createOwnerAdminRecoveryService({ firebaseUserLookup, queries, source }) {
  return {
    async recoverOwner() {
      const envCheck = validateOwnerAdminRecoveryEnv(source);
      if (!envCheck.ok) {
        return toSanitizedResult({
          ok: false,
          category: envCheck.category
        });
      }

      const targetResult = await queries.findOwnerRecoveryTarget({
        identifier: envCheck.targetIdentifier
      });
      if (!targetResult.ok) {
        return toSanitizedResult(targetResult);
      }

      let firebaseUser;
      try {
        firebaseUser = await firebaseUserLookup.getUserByEmail(targetResult.target.email);
      } catch (error) {
        if (isFirebaseUserNotFound(error)) {
          return toSanitizedResult({
            ok: false,
            category: "ADMIN_FIREBASE_USER_NOT_FOUND",
            targetFound: true,
            targetUnique: true,
            targetEligible: true
          });
        }
        throw error;
      }

      if (!firebaseUser?.uid) {
        return toSanitizedResult({
          ok: false,
          category: "ADMIN_FIREBASE_USER_NOT_FOUND",
          targetFound: true,
          targetUnique: true,
          targetEligible: true
        });
      }
      if (firebaseUser.disabled === true) {
        return toSanitizedResult({
          ok: false,
          category: "ADMIN_FIREBASE_USER_DISABLED",
          targetFound: true,
          targetUnique: true,
          targetEligible: true,
          adminFirebaseUserFound: true,
          firebaseUserEnabled: false
        });
      }

      const result = await queries.recoverOwnerRole({
        targetUserId: targetResult.target.userId,
        firebaseAuthUid: firebaseUser.uid,
        recoveryReason: envCheck.recoveryReason
      });

      return toSanitizedResult({
        targetFound: true,
        targetUnique: true,
        targetEligible: true,
        adminFirebaseUserFound: true,
        firebaseUserEnabled: true,
        ...result
      });
    }
  };
}
