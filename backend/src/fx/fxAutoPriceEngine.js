import {
  FX_AUTO_CIRCUIT_BREAKER_BPS,
  FX_AUTO_UPDATE_THRESHOLD_BPS,
  FX_MAX_RATE_AGE_HOURS,
  calculateDivergenceBps,
  calculateRateChangeBps,
  convertKrwToCurrency,
  isSnapshotFresh,
  toMinorUnits
} from "./fxMath.js";
import { FX_PRICING_MODES, isFxAutoAllowed } from "./fxAutoPricePolicy.js";

export function getFxAutoThresholds(input = {}) {
  return {
    updateThresholdBps: Number(input.updateThresholdBps ?? FX_AUTO_UPDATE_THRESHOLD_BPS),
    circuitBreakerBps: Number(input.circuitBreakerBps ?? FX_AUTO_CIRCUIT_BREAKER_BPS),
    maxRateAgeHours: Number(input.maxRateAgeHours ?? FX_MAX_RATE_AGE_HOURS)
  };
}

export function selectRateForPolicy(snapshotBundle, policy) {
  if (!snapshotBundle?.rates) return null;
  return snapshotBundle.rates[policy.targetCurrency] || null;
}

export function calculateFxReference({ policy, sourcePrice, rate }) {
  if (!sourcePrice || !rate) return null;
  return {
    wholesalePrice: convertKrwToCurrency(sourcePrice.wholesalePrice, rate.rateScaled, policy.targetCurrency),
    retailPrice: sourcePrice.retailPrice == null
      ? null
      : convertKrwToCurrency(sourcePrice.retailPrice, rate.rateScaled, policy.targetCurrency),
    minOrderAmount: sourcePrice.minOrderAmount == null
      ? null
      : convertKrwToCurrency(sourcePrice.minOrderAmount, rate.rateScaled, policy.targetCurrency)
  };
}

export function evaluateFxAutoPolicy({
  policy,
  sourcePrice,
  publishedPrice,
  snapshotBundle,
  thresholds = getFxAutoThresholds(),
  now = new Date()
}) {
  const rate = selectRateForPolicy(snapshotBundle, policy);
  const baseResult = {
    policyId: policy.id,
    productId: policy.productId,
    targetMarket: policy.targetMarket,
    targetCurrency: policy.targetCurrency,
    pricingMode: policy.pricingMode,
    rateSnapshotId: rate?.id || null,
    sourcePriceUpdatedAt: sourcePrice?.updatedAt || null,
    reference: null,
    divergenceBps: null,
    rateChangeBps: null,
    status: policy.status || "pending_rate"
  };

  if (policy.pricingMode === FX_PRICING_MODES.MANUAL_FIXED) {
    return { ...baseResult, action: "manual_fixed", status: "active", reason: "Manual fixed price is not changed by FX" };
  }

  if (!isFxAutoAllowed(policy.targetMarket, policy.targetCurrency)) {
    return { ...baseResult, action: "error", status: "error", reason: "FX_AUTO is not allowed for this market/currency" };
  }

  if (!sourcePrice) {
    return { ...baseResult, action: "error", status: "error", reason: "KR/KRW source price is missing" };
  }

  if (!rate) {
    return { ...baseResult, action: "pending_rate", status: "pending_rate", reason: "Complete FX rate bundle is missing" };
  }

  const reference = calculateFxReference({ policy, sourcePrice, rate });
  const next = { ...baseResult, reference, latestReferenceWholesalePrice: reference?.wholesalePrice ?? null };
  const fresh = isSnapshotFresh(rate.sourceEffectiveAt, now, thresholds.maxRateAgeHours);
  if (!fresh) {
    return { ...next, action: "blocked_stale", status: "blocked_stale", reason: "FX rate sourceEffectiveAt is stale" };
  }

  if (policy.lastAppliedRateScaled) {
    const rateChangeBps = calculateRateChangeBps(policy.lastAppliedRateScaled, rate.rateScaled);
    next.rateChangeBps = rateChangeBps;
    if (rateChangeBps >= thresholds.circuitBreakerBps) {
      return { ...next, action: "blocked_spike", status: "blocked_spike", reason: "FX rate movement reached circuit breaker" };
    }
  }

  const sourceChanged = Boolean(
    sourcePrice.updatedAt &&
    policy.sourcePriceUpdatedAt &&
    String(sourcePrice.updatedAt) !== String(policy.sourcePriceUpdatedAt)
  );

  if (!publishedPrice) {
    return { ...next, action: "initial_created", status: "created", reason: "Initial FX_AUTO price can be created" };
  }

  const publishedMinor = toMinorUnits(publishedPrice.wholesalePrice, policy.targetCurrency);
  const referenceMinor = toMinorUnits(reference.wholesalePrice, policy.targetCurrency);
  const divergenceBps = calculateDivergenceBps(publishedMinor, referenceMinor);
  next.divergenceBps = divergenceBps;

  if (!sourceChanged && divergenceBps < thresholds.updateThresholdBps) {
    return { ...next, action: "held_deadband", status: "held_deadband", reason: "Published price remains within 5% deadband" };
  }

  return {
    ...next,
    action: "auto_updated",
    status: "updated",
    reason: sourceChanged ? "KR source price changed; FX_AUTO recalculated immediately" : "Reference divergence reached update threshold"
  };
}
