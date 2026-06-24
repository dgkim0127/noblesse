import { getCurrencyMinorUnits } from "../config/pricing.js";

export const FX_RATE_SCALE = 100000000;
export const FX_REVIEW_THRESHOLD_BPS = 200;
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

export function calculateRateChangeBps(anchorRateScaled, currentRateScaled) {
  const anchor = Number(anchorRateScaled);
  const current = Number(currentRateScaled);
  if (!Number.isFinite(anchor) || !Number.isFinite(current) || anchor <= 0 || current <= 0) {
    throw new Error("Invalid FX rate movement");
  }
  return Math.round((Math.abs(current - anchor) * 10000) / anchor);
}

export function isRateMovementDraftable(anchorRateScaled, currentRateScaled, thresholdBps = FX_REVIEW_THRESHOLD_BPS) {
  return calculateRateChangeBps(anchorRateScaled, currentRateScaled) >= thresholdBps;
}

export function isSnapshotFresh(fetchedAt, now = new Date(), maxAgeHours = FX_MAX_RATE_AGE_HOURS) {
  const fetched = new Date(fetchedAt).getTime();
  if (!Number.isFinite(fetched)) return false;
  return now.getTime() - fetched <= maxAgeHours * 60 * 60 * 1000;
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

export function getCurrencyStep(currency) {
  return getCurrencyMinorUnits(currency) === 0 ? 1 : 0.01;
}

export function roundCalculatedMoney(value, currency) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  const minorUnits = getCurrencyMinorUnits(currency);
  const multiplier = 10 ** minorUnits;
  return Math.round(parsed * multiplier) / multiplier;
}
