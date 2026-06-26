import crypto from "node:crypto";
import { CURRENCIES } from "../config/pricing.js";
import { toRateScaled } from "./fxMath.js";

const supportedRateCurrencies = ["KRW", "JPY", "USD", "TWD"];

const maxClockSkewMs = 5 * 60 * 1000;

function assertIsoTimestamp(value, fieldName) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return date.toISOString();
}

function assertTimestampOrder({ sourceEffectiveAt, fetchedAt, now }) {
  const sourceDate = new Date(sourceEffectiveAt);
  const fetchedDate = new Date(fetchedAt);
  const nowDate = now instanceof Date ? now : new Date(now);
  const latestAllowed = new Date(nowDate.getTime() + maxClockSkewMs);
  if (fetchedDate < sourceDate) {
    throw new Error("fetchedAt must be greater than or equal to sourceEffectiveAt");
  }
  if (sourceDate > latestAllowed) {
    throw new Error("sourceEffectiveAt is too far in the future");
  }
  if (fetchedDate > latestAllowed) {
    throw new Error("fetchedAt is too far in the future");
  }
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashFxPayload(payload) {
  return crypto.createHash("sha256").update(canonicalJson(payload)).digest("hex");
}

export function normalizeFxProviderPayload(payload = {}, { now = () => new Date() } = {}) {
  const provider = String(payload.provider || "").trim();
  if (!provider) throw new Error("FX provider is required");
  if (payload.baseCurrency !== "KRW") throw new Error("FX base currency must be KRW");

  const nowDate = typeof now === "function" ? now() : now;
  const sourceEffectiveAt = assertIsoTimestamp(payload.sourceEffectiveAt, "sourceEffectiveAt");
  const fetchedAt = assertIsoTimestamp(payload.fetchedAt || nowDate.toISOString(), "fetchedAt");
  assertTimestampOrder({ sourceEffectiveAt, fetchedAt, now: nowDate });
  const rawRates = payload.rates && typeof payload.rates === "object" ? payload.rates : {};
  const rates = {};

  for (const currency of supportedRateCurrencies) {
    if (!CURRENCIES.includes(currency)) throw new Error(`Unsupported currency ${currency}`);
    if (currency !== "KRW" && rawRates[currency] === undefined) {
      throw new Error(`Missing FX rate ${currency}`);
    }
    const rateValue = currency === "KRW" ? 1 : rawRates[currency];
    const rateScaled = toRateScaled(rateValue);
    rates[currency] = {
      currency,
      krwPerUnit: Number(rateValue),
      rateScaled
    };
  }

  for (const currency of Object.keys(rawRates)) {
    if (!supportedRateCurrencies.includes(currency)) {
      throw new Error(`Unsupported currency ${currency}`);
    }
  }

  return {
    provider,
    baseCurrency: "KRW",
    rates,
    sourceEffectiveAt,
    fetchedAt,
    payloadHash: hashFxPayload({
      provider,
      baseCurrency: "KRW",
      rates: Object.fromEntries(Object.entries(rates).map(([key, value]) => [key, value.rateScaled])),
      sourceEffectiveAt
    })
  };
}
