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

function hasUnsafeInput(source = {}) {
  return Object.entries(source).some(([key, value]) => {
    if (value === undefined || value === null || String(value) === "") return false;
    return /password|token|cookie|private_key|service_role/i.test(key);
  });
}

export function validateOwnerSafeRbacSchemaEnv(source = process.env) {
  if (source.NOBLESSE_OWNER_SAFE_RBAC_BOOTSTRAP_ALLOW !== "YES") {
    return { ok: false, category: "BOOTSTRAP_NOT_ALLOWED" };
  }
  if (!hasProductionRuntimeMarker(source)) {
    return { ok: false, category: "NON_PRODUCTION_RUNTIME" };
  }
  if (hasUnsafeInput(source)) {
    return { ok: false, category: "UNSAFE_INPUT_REJECTED" };
  }
  return { ok: true };
}

function sanitize(result = {}) {
  return {
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
  };
}

export function createOwnerSafeRbacSchemaService({ queries, source }) {
  return {
    async applyBootstrap() {
      const envCheck = validateOwnerSafeRbacSchemaEnv(source);
      if (!envCheck.ok) return sanitize(envCheck);

      const result = await queries.applyOwnerSafeBootstrap();
      return sanitize(result);
    }
  };
}
