import { CURRENCIES, getCurrencyMinorUnits } from "../config/pricing.js";

const moneyPattern = /^[+-]?\d+(?:\.\d+)?$/;

function normalizeDecimalInput(value) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return String(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || /e/i.test(trimmed)) return null;
    return trimmed;
  }
  return null;
}

function parseDecimalParts(value) {
  const normalized = normalizeDecimalInput(value);
  if (!normalized || !moneyPattern.test(normalized)) return null;
  const sign = normalized.startsWith("-") ? -1 : 1;
  const unsigned = normalized.replace(/^[+-]/, "");
  const [wholePart, fractionPart = ""] = unsigned.split(".");
  return { fractionPart, sign, wholePart };
}

export function toMinorUnits(value, currency) {
  if (!CURRENCIES.includes(currency)) return null;
  const parts = parseDecimalParts(value);
  if (!parts || parts.sign < 0) return null;

  const minorUnits = getCurrencyMinorUnits(currency);
  const fractionPart =
    parts.fractionPart.length > minorUnits
      ? parts.fractionPart.slice(0, minorUnits)
      : parts.fractionPart;
  const extraFractionPart =
    parts.fractionPart.length > minorUnits
      ? parts.fractionPart.slice(minorUnits)
      : "";
  if (extraFractionPart && /[1-9]/.test(extraFractionPart)) return null;

  const whole = BigInt(parts.wholePart || "0");
  const fraction = BigInt((fractionPart || "").padEnd(minorUnits, "0") || "0");
  const multiplier = 10n ** BigInt(minorUnits);
  const minor = whole * multiplier + fraction;
  if (minor > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(minor);
}

export function fromMinorUnits(value, currency) {
  if (!CURRENCIES.includes(currency)) return null;
  if (!Number.isSafeInteger(value)) return null;
  const minorUnits = getCurrencyMinorUnits(currency);
  const multiplier = 10 ** minorUnits;
  return value / multiplier;
}

export function validateMoneyPrecision(value, currency) {
  return toMinorUnits(value, currency) !== null;
}

function parseDiscountBasisPoints(discountRate) {
  const parts = parseDecimalParts(discountRate ?? 0);
  if (!parts || parts.sign < 0) return 0;

  const fraction = parts.fractionPart.padEnd(2, "0").slice(0, 2);
  const truncated = Number(`${parts.wholePart || "0"}${fraction || "00"}`);
  if (!Number.isSafeInteger(truncated)) return 0;
  return Math.min(truncated, 10000);
}

function divideRounded(value, divisor) {
  const quotient = value / divisor;
  const remainder = value % divisor;
  return quotient + (remainder * 2n >= divisor ? 1n : 0n);
}

export function roundMoney(value, currency) {
  const minor = toMinorUnits(value, currency);
  return minor === null ? null : fromMinorUnits(minor, currency);
}

export function applyDiscount(value, discountRate, currency) {
  const minor = toMinorUnits(value, currency);
  if (minor === null) return null;
  const discountBasisPoints = parseDiscountBasisPoints(discountRate);
  const discounted = divideRounded(BigInt(minor) * BigInt(10000 - discountBasisPoints), 10000n);
  if (discounted > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return fromMinorUnits(Number(discounted), currency);
}

export function multiplyMoney(value, quantity, currency) {
  const minor = toMinorUnits(value, currency);
  if (minor === null || !Number.isSafeInteger(quantity) || quantity < 0) return null;
  const subtotal = BigInt(minor) * BigInt(quantity);
  if (subtotal > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return fromMinorUnits(Number(subtotal), currency);
}

export function sumMoney(values, currency) {
  let total = 0n;
  for (const value of values) {
    const minor = toMinorUnits(value, currency);
    if (minor === null) return null;
    total += BigInt(minor);
    if (total > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  }
  return fromMinorUnits(Number(total), currency);
}
