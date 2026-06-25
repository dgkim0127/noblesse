import { CURRENCIES } from "../config/pricing.js";
import { FX_MAX_RATE_AGE_HOURS, toRateScaled } from "./fxMath.js";
import { normalizeFxProviderPayload } from "./fxRateNormalizer.js";

export const EXCHANGE_RATE_API_PROVIDER_ID = "exchange_rate_api";
export const EXCHANGE_RATE_API_SECRET_ENV = "EXCHANGE_RATE_API_KEY";
export const EXCHANGE_RATE_API_ORIGIN = "https://v6.exchangerate-api.com";
export const EXCHANGE_RATE_API_BASE_CURRENCY = "KRW";
export const EXCHANGE_RATE_API_PATH = `/v6/latest/${EXCHANGE_RATE_API_BASE_CURRENCY}`;

const requiredCurrencies = ["KRW", "JPY", "USD", "CNY"];
const providerTimeoutMs = 5000;
const maxProviderBodyBytes = 128 * 1024;
const maxClockSkewMs = 5 * 60 * 1000;

export class FxProviderError extends Error {
  constructor(message, { category = "provider_error", retryable = false, status = null } = {}) {
    super(message);
    this.name = "FxProviderError";
    this.category = category;
    this.retryable = retryable;
    this.status = status;
  }
}

function getHeader(headers, name) {
  if (!headers) return null;
  if (typeof headers.get === "function") return headers.get(name);
  return headers[name] || headers[name.toLowerCase()] || null;
}

function assertApiKey(apiKey) {
  if (typeof apiKey !== "string" || apiKey.trim() === "") {
    throw new FxProviderError("ExchangeRate-API credential is missing", {
      category: "authentication",
      retryable: false
    });
  }
  return apiKey.trim();
}

function assertObject(value, category = "malformed_payload") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new FxProviderError("ExchangeRate-API payload must be a JSON object", { category });
  }
  return value;
}

function assertPositiveFiniteNumber(value, fieldName) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new FxProviderError(`Invalid ExchangeRate-API ${fieldName}`, {
      category: "malformed_payload",
      retryable: false
    });
  }
  return value;
}

function assertUnixTimestamp(value) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new FxProviderError("Invalid ExchangeRate-API update timestamp", {
      category: "malformed_payload",
      retryable: false
    });
  }
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) {
    throw new FxProviderError("Invalid ExchangeRate-API update timestamp", {
      category: "malformed_payload",
      retryable: false
    });
  }
  return date;
}

function assertUtcTextMatchesUnix(payload, sourceDate) {
  if (!payload.time_last_update_utc) return;
  if (typeof payload.time_last_update_utc !== "string") {
    throw new FxProviderError("Invalid ExchangeRate-API UTC timestamp", {
      category: "malformed_payload",
      retryable: false
    });
  }
  const utcDate = new Date(payload.time_last_update_utc);
  if (Number.isNaN(utcDate.getTime()) || Math.abs(utcDate.getTime() - sourceDate.getTime()) > 1000) {
    throw new FxProviderError("ExchangeRate-API timestamp fields disagree", {
      category: "malformed_payload",
      retryable: false
    });
  }
}

function assertSourceTimeAllowed(sourceDate, nowDate) {
  const latestAllowed = nowDate.getTime() + maxClockSkewMs;
  if (sourceDate.getTime() > latestAllowed) {
    throw new FxProviderError("ExchangeRate-API source timestamp is in the future", {
      category: "future_timestamp",
      retryable: false
    });
  }
  if (nowDate.getTime() - sourceDate.getTime() > FX_MAX_RATE_AGE_HOURS * 60 * 60 * 1000) {
    throw new FxProviderError("ExchangeRate-API source timestamp is stale", {
      category: "stale_payload",
      retryable: false
    });
  }
}

function providerErrorCategory(errorType) {
  switch (errorType) {
    case "invalid-key":
      return { category: "authentication", retryable: false };
    case "inactive-account":
      return { category: "account_configuration", retryable: false };
    case "quota-reached":
      return { category: "quota_or_rate_limit", retryable: true };
    case "unsupported-code":
      return { category: "provider_configuration", retryable: false };
    case "malformed-request":
      return { category: "provider_request", retryable: false };
    default:
      return { category: "provider_error", retryable: false };
  }
}

function httpErrorCategory(status) {
  if (status === 401 || status === 403) return { category: "authentication", retryable: false };
  if (status === 408) return { category: "transport", retryable: true };
  if (status === 429) return { category: "quota_or_rate_limit", retryable: true };
  if (status >= 400 && status < 500) return { category: "provider_4xx", retryable: false };
  if (status >= 500 && status < 600) return { category: "provider_5xx", retryable: true };
  if (status >= 300 && status < 400) return { category: "redirect_rejected", retryable: false };
  return { category: "provider_error", retryable: false };
}

function buildFixedProviderUrl() {
  return new URL(EXCHANGE_RATE_API_PATH, EXCHANGE_RATE_API_ORIGIN);
}

function sanitizeTransportError(error) {
  if (error?.name === "AbortError") {
    return new FxProviderError("ExchangeRate-API request timed out", {
      category: "timeout",
      retryable: true
    });
  }
  if (error instanceof FxProviderError) return error;
  return new FxProviderError("ExchangeRate-API transport failure", {
    category: "transport",
    retryable: true
  });
}

async function readBoundedJson(response) {
  const contentLength = Number(getHeader(response.headers, "content-length") || 0);
  if (contentLength > maxProviderBodyBytes) {
    throw new FxProviderError("ExchangeRate-API response body is too large", {
      category: "malformed_payload",
      retryable: false,
      status: response.status
    });
  }
  const bodyText = await response.text();
  if (bodyText.length > maxProviderBodyBytes) {
    throw new FxProviderError("ExchangeRate-API response body is too large", {
      category: "malformed_payload",
      retryable: false,
      status: response.status
    });
  }
  try {
    return JSON.parse(bodyText);
  } catch {
    throw new FxProviderError("ExchangeRate-API response is not valid JSON", {
      category: "malformed_payload",
      retryable: false,
      status: response.status
    });
  }
}

export function normalizeExchangeRateApiPayload(payload = {}, { now = () => new Date(), fetchedAt } = {}) {
  const safePayload = assertObject(payload);
  if (safePayload.result !== "success") {
    const errorType = typeof safePayload["error-type"] === "string" ? safePayload["error-type"] : "unknown";
    const classification = providerErrorCategory(errorType);
    throw new FxProviderError("ExchangeRate-API returned an error result", classification);
  }
  if (safePayload.base_code !== EXCHANGE_RATE_API_BASE_CURRENCY) {
    throw new FxProviderError("ExchangeRate-API base currency mismatch", {
      category: "provider_configuration",
      retryable: false
    });
  }
  const sourceDate = assertUnixTimestamp(safePayload.time_last_update_unix);
  assertUtcTextMatchesUnix(safePayload, sourceDate);
  const nowDate = typeof now === "function" ? now() : new Date(now);
  assertSourceTimeAllowed(sourceDate, nowDate);
  const rates = assertObject(safePayload.conversion_rates);

  for (const currency of requiredCurrencies) {
    if (!CURRENCIES.includes(currency) || !Object.hasOwn(rates, currency)) {
      throw new FxProviderError(`Missing ExchangeRate-API rate for ${currency}`, {
        category: "incomplete_payload",
        retryable: false
      });
    }
  }
  if (rates.KRW !== 1) {
    throw new FxProviderError("ExchangeRate-API base currency rate must be 1", {
      category: "malformed_payload",
      retryable: false
    });
  }

  const krwPerUnit = {};
  for (const currency of requiredCurrencies) {
    const providerRate = assertPositiveFiniteNumber(rates[currency], `${currency} rate`);
    krwPerUnit[currency] = currency === "KRW" ? 1 : 1 / providerRate;
    toRateScaled(krwPerUnit[currency]);
  }

  const fetchedDate = fetchedAt ? new Date(fetchedAt) : nowDate;
  return normalizeFxProviderPayload({
    provider: EXCHANGE_RATE_API_PROVIDER_ID,
    baseCurrency: "KRW",
    sourceEffectiveAt: sourceDate.toISOString(),
    fetchedAt: fetchedDate.toISOString(),
    rates: {
      JPY: krwPerUnit.JPY,
      USD: krwPerUnit.USD,
      CNY: krwPerUnit.CNY
    }
  }, { now: nowDate });
}

export async function fetchExchangeRateApiSnapshot({
  apiKey,
  env = process.env,
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
  timeoutMs = providerTimeoutMs
} = {}) {
  const credential = assertApiKey(apiKey ?? env[EXCHANGE_RATE_API_SECRET_ENV]);
  if (typeof fetchImpl !== "function") {
    throw new FxProviderError("ExchangeRate-API HTTP transport is not configured", {
      category: "transport",
      retryable: false
    });
  }
  const url = buildFixedProviderUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${credential}`,
        "User-Agent": "noblesse-fx-rate-job"
      }
    });
  } catch (error) {
    throw sanitizeTransportError(error);
  } finally {
    clearTimeout(timeout);
  }

  if (!response || typeof response.status !== "number") {
    throw new FxProviderError("ExchangeRate-API response is invalid", {
      category: "transport",
      retryable: true
    });
  }
  if (!response.ok) {
    const classification = httpErrorCategory(response.status);
    throw new FxProviderError("ExchangeRate-API HTTP request failed", {
      ...classification,
      status: response.status
    });
  }
  const fetchedAt = typeof now === "function" ? now() : new Date(now);
  const payload = await readBoundedJson(response);
  return normalizeExchangeRateApiPayload(payload, { now, fetchedAt });
}

export async function fetchOfficialFxRates(options = {}) {
  return fetchExchangeRateApiSnapshot(options);
}
