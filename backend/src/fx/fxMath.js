import { getCurrencyMinorUnits } from "../config/pricing.js";

export const FX_RATE_SCALE = 100000000;
export const FX_AUTO_UPDATE_THRESHOLD_BPS = 500;
export const FX_AUTO_CIRCUIT_BREAKER_BPS = 1500;
export const FX_MAX_RATE_AGE_HOURS = 72;

export function toRateScaled(krwPerUnit) {
  const parsed = Number(krwPerUnit);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Invalid KRW per unit rate");
  }
  const scaled = Math.round(parsed * FX_RATE_SCALE);
  if (!Number.isSafeInteger(scaled) || scaled <= 0) {
    throw new Error("Invalid scaled FX rate");
  }
  return scaled;
}

export function fromRateScaled(rateScaled) {
  const parsed = Number(rateScaled);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Invalid scaled FX rate");
  }
  return parsed / FX_RATE_SCALE;
}

export function calculateBpsChange(previousValue, currentValue) {
  const previous = Number(previousValue);
  const current = Number(currentValue);
  if (!Number.isFinite(previous) || !Number.isFinite(current) || previous < 0 || current < 0) {
    throw new Error("Invalid basis-point values");
  }
  if (previous === 0) {
    return current === 0 ? 0 : 10000;
  }
  return Math.round((Math.abs(current - previous) * 10000) / previous);
}

export function calculateRateChangeBps(anchorRateScaled, currentRateScaled) {
  const anchor = Number(anchorRateScaled);
  const current = Number(currentRateScaled);
  if (!Number.isFinite(anchor) || !Number.isFinite(current) || anchor <= 0 || current <= 0) {
    throw new Error("Invalid FX rate movement");
  }
  return calculateBpsChange(anchor, current);
}

export function calculateDivergenceBps(publishedMinor, referenceMinor) {
  const published = Number(publishedMinor);
  const reference = Number(referenceMinor);
  if (!Number.isFinite(published) || !Number.isFinite(reference) || published < 0 || reference < 0) {
    throw new Error("Invalid FX divergence values");
  }
  return Math.round((Math.abs(reference - published) * 10000) / Math.max(Math.abs(published), 1));
}

export function isSnapshotFresh(sourceEffectiveAt, now = new Date(), maxAgeHours = FX_MAX_RATE_AGE_HOURS) {
  const effective = new Date(sourceEffectiveAt).getTime();
  const nowTime = new Date(now).getTime();
  if (!Number.isFinite(effective) || !Number.isFinite(nowTime)) return false;
  if (effective - nowTime > 5 * 60 * 1000) return false;
  return nowTime - effective <= maxAgeHours * 60 * 60 * 1000;
}

export function getCurrencyStep(currency) {
  return getCurrencyMinorUnits(currency) === 0 ? 1 : 0.01;
}

export function toMinorUnits(value, currency) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Invalid money value");
  }
  const multiplier = 10 ** getCurrencyMinorUnits(currency);
  const minor = Math.round(parsed * multiplier);
  if (!Number.isSafeInteger(minor)) {
    throw new Error("Unsafe money value");
  }
  return minor;
}

export function fromMinorUnits(minorValue, currency) {
  const parsed = Number(minorValue);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error("Invalid minor-unit value");
  }
  const multiplier = 10 ** getCurrencyMinorUnits(currency);
  return roundCalculatedMoney(parsed / multiplier, currency);
}

export function roundCalculatedMoney(value, currency) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  const multiplier = 10 ** getCurrencyMinorUnits(currency);
  return Math.round(parsed * multiplier) / multiplier;
}

export function convertKrwToCurrency(krwAmount, currentRateScaled, currency) {
  const rate = fromRateScaled(currentRateScaled);
  return roundCalculatedMoney(Number(krwAmount) / rate, currency);
}

export function convertPublishedAmountByFxChange(currentAmount, anchorRateScaled, currentRateScaled, currency) {
  const amount = Number(currentAmount);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Invalid current amount");
  }
  const impliedKrw = amount * fromRateScaled(anchorRateScaled);
  return roundCalculatedMoney(impliedKrw / fromRateScaled(currentRateScaled), currency);
}
