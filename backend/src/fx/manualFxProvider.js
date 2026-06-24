import { normalizeFxProviderPayload } from "./fxRateNormalizer.js";

export function parseManualFxPayload(input) {
  const payload = typeof input === "string" ? JSON.parse(input) : input;
  return normalizeFxProviderPayload({
    provider: payload?.provider || "manual",
    baseCurrency: payload?.baseCurrency || "KRW",
    rates: payload?.rates,
    sourceEffectiveAt: payload?.sourceEffectiveAt,
    fetchedAt: payload?.fetchedAt
  });
}
