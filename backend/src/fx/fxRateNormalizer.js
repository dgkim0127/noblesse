import crypto from "node:crypto";
import { CURRENCIES } from "../config/pricing.js";
import { toRateScaled } from "./fxMath.js";

const supportedRateCurrencies = ["KRW", "JPY", "USD", "CNY"];

function assertIsoTimestamp(value, fieldName) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return date.toISOString();
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

export function normalizeFxProviderPayload(payload = {}) {
  const provider = String(payload.provider || "").trim();
  if (!provider) throw new Error("FX provider is required");
  if (payload.baseCurrency !== "KRW") throw new Error("FX base currency must be KRW");

  const sourceEffectiveAt = assertIsoTimestamp(payload.sourceEffectiveAt, "sourceEffectiveAt");
  const fetchedAt = assertIsoTimestamp(payload.fetchedAt || new Date().toISOString(), "fetchedAt");
  const rawRates = payload.rates && typeof payload.rates === "object" ? payload.rates : {};
  const rates = {};

  for (const currency of supportedRateCurrencies) {
    if (!CURRENCIES.includes(currency)) throw new Error(`Unsupported currency ${currency}`);
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
