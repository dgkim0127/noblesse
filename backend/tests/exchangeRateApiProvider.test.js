import assert from "node:assert/strict";
import test from "node:test";
import {
  EXCHANGE_RATE_API_ORIGIN,
  EXCHANGE_RATE_API_PATH,
  EXCHANGE_RATE_API_PROVIDER_ID,
  EXCHANGE_RATE_API_SECRET_ENV,
  FxProviderError,
  fetchExchangeRateApiSnapshot,
  normalizeExchangeRateApiPayload
} from "../src/fx/officialFxProvider.js";
import { toRateScaled } from "../src/fx/fxMath.js";

const now = new Date("2026-06-25T12:00:00.000Z");
const sourceUnix = Math.floor(now.getTime() / 1000) - 60;
const sourceIso = new Date(sourceUnix * 1000).toISOString();
const expectedUrl = `${EXCHANGE_RATE_API_ORIGIN}${EXCHANGE_RATE_API_PATH}`;

function successPayload(overrides = {}) {
  return {
    result: "success",
    documentation: "https://www.exchangerate-api.com/docs",
    terms_of_use: "https://www.exchangerate-api.com/terms",
    time_last_update_unix: sourceUnix,
    time_last_update_utc: new Date(sourceUnix * 1000).toUTCString(),
    time_next_update_unix: sourceUnix + 3600,
    time_next_update_utc: new Date((sourceUnix + 3600) * 1000).toUTCString(),
    base_code: "KRW",
    conversion_rates: {
      KRW: 1,
      USD: 1 / 1400,
      JPY: 150 / 1400,
      CNY: 7 / 1400,
      EUR: 1 / 1500
    },
    ...overrides
  };
}

function mockResponse({ status = 200, body = successPayload(), headers = {} } = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get(name) {
        return headers[name] || headers[name.toLowerCase()] || null;
      }
    },
    async text() {
      return typeof body === "string" ? body : JSON.stringify(body);
    }
  };
}

function assertCategory(fn, category, pattern = /ExchangeRate-API|Invalid|Missing|timestamp|rate|payload/) {
  assert.throws(fn, (error) => {
    assert.equal(error instanceof FxProviderError, true);
    assert.equal(error.category, category);
    assert.match(error.message, pattern);
    assert.doesNotMatch(error.message, /secret-value|test-key|Bearer/i);
    return true;
  });
}

test("ExchangeRate-API adapter parses a valid success payload into canonical KRW_PER_UNIT rates", () => {
  const snapshot = normalizeExchangeRateApiPayload(successPayload(), {
    now: () => now,
    fetchedAt: now
  });

  assert.equal(snapshot.provider, EXCHANGE_RATE_API_PROVIDER_ID);
  assert.equal(snapshot.baseCurrency, "KRW");
  assert.equal(snapshot.sourceEffectiveAt, sourceIso);
  assert.equal(snapshot.fetchedAt, now.toISOString());
  assert.equal(snapshot.rates.KRW.rateScaled, toRateScaled(1));
  assert.equal(snapshot.rates.USD.rateScaled, toRateScaled(1400));
  assert.equal(snapshot.rates.JPY.rateScaled, toRateScaled(1400 / 150));
  assert.equal(snapshot.rates.CNY.rateScaled, toRateScaled(1400 / 7));
  assert.match(snapshot.payloadHash, /^[a-f0-9]{64}$/);
});

test("ExchangeRate-API fetch uses fixed origin, Bearer auth, no query secret, and one HTTP request", async () => {
  const calls = [];
  const snapshot = await fetchExchangeRateApiSnapshot({
    env: { [EXCHANGE_RATE_API_SECRET_ENV]: "test-key" },
    now: () => now,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return mockResponse();
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(String(calls[0].url), expectedUrl);
  assert.equal(calls[0].url.search, "");
  assert.equal(calls[0].options.method, "GET");
  assert.equal(calls[0].options.redirect, "manual");
  assert.equal(calls[0].options.headers.Authorization, "Bearer test-key");
  assert.doesNotMatch(String(calls[0].url), /test-key|Bearer/i);
  assert.equal(snapshot.provider, EXCHANGE_RATE_API_PROVIDER_ID);
});

test("ExchangeRate-API adapter rejects missing or blank credentials without leaking values", async () => {
  await assert.rejects(() => fetchExchangeRateApiSnapshot({
    env: {},
    fetchImpl: async () => mockResponse()
  }), (error) => {
    assert.equal(error.category, "authentication");
    assert.doesNotMatch(error.message, /EXCHANGE_RATE_API_KEY|Bearer|password|test-key/i);
    return true;
  });
  await assert.rejects(() => fetchExchangeRateApiSnapshot({
    env: { [EXCHANGE_RATE_API_SECRET_ENV]: "   " },
    fetchImpl: async () => mockResponse()
  }), (error) => {
    assert.equal(error.category, "authentication");
    assert.doesNotMatch(error.message, /Bearer|password/i);
    return true;
  });
});

test("ExchangeRate-API adapter classifies provider error payloads", () => {
  const cases = [
    ["invalid-key", "authentication", false],
    ["inactive-account", "account_configuration", false],
    ["quota-reached", "quota_or_rate_limit", true],
    ["unsupported-code", "provider_configuration", false],
    ["malformed-request", "provider_request", false],
    ["other", "provider_error", false]
  ];
  for (const [errorType, category, retryable] of cases) {
    assert.throws(() => normalizeExchangeRateApiPayload({ result: "error", "error-type": errorType }, { now: () => now }), (error) => {
      assert.equal(error.category, category);
      assert.equal(error.retryable, retryable);
      assert.doesNotMatch(error.message, new RegExp(errorType));
      return true;
    });
  }
});

test("ExchangeRate-API adapter rejects malformed success payload shapes", () => {
  assertCategory(() => normalizeExchangeRateApiPayload([], { now: () => now }), "malformed_payload");
  assertCategory(() => normalizeExchangeRateApiPayload({ ...successPayload(), result: undefined }, { now: () => now }), "provider_error");
  assertCategory(() => normalizeExchangeRateApiPayload({ ...successPayload(), base_code: "USD" }, { now: () => now }), "provider_configuration");
  assertCategory(() => normalizeExchangeRateApiPayload({ ...successPayload(), time_last_update_unix: "123" }, { now: () => now }), "malformed_payload");
  assertCategory(() => normalizeExchangeRateApiPayload({ ...successPayload(), time_last_update_unix: sourceUnix + 0.5 }, { now: () => now }), "malformed_payload");
  assertCategory(() => normalizeExchangeRateApiPayload({ ...successPayload(), time_last_update_unix: 0 }, { now: () => now }), "malformed_payload");
  assertCategory(() => normalizeExchangeRateApiPayload({ ...successPayload(), time_last_update_unix: -1 }, { now: () => now }), "malformed_payload");
  assertCategory(() => normalizeExchangeRateApiPayload({ ...successPayload(), time_last_update_utc: new Date((sourceUnix + 10) * 1000).toUTCString() }, { now: () => now }), "malformed_payload");
});

test("ExchangeRate-API adapter rejects stale and future timestamps before snapshot persistence", () => {
  assertCategory(() => normalizeExchangeRateApiPayload(successPayload({
    time_last_update_unix: Math.floor(now.getTime() / 1000) + 301,
    time_last_update_utc: new Date(now.getTime() + 301000).toUTCString()
  }), { now: () => now }), "future_timestamp");
  assertCategory(() => normalizeExchangeRateApiPayload(successPayload({
    time_last_update_unix: Math.floor(now.getTime() / 1000) - (73 * 60 * 60),
    time_last_update_utc: new Date(now.getTime() - (73 * 60 * 60 * 1000)).toUTCString()
  }), { now: () => now }), "stale_payload");
});

test("ExchangeRate-API adapter rejects missing or invalid required currencies and rates", () => {
  for (const currency of ["KRW", "JPY", "USD", "CNY"]) {
    const conversionRates = { ...successPayload().conversion_rates };
    delete conversionRates[currency];
    assertCategory(() => normalizeExchangeRateApiPayload(successPayload({ conversion_rates: conversionRates }), { now: () => now }), "incomplete_payload");
  }

  const invalidRates = [null, "1.23", 0, -1, Number.NaN, Number.POSITIVE_INFINITY, false];
  for (const value of invalidRates) {
    assertCategory(() => normalizeExchangeRateApiPayload(successPayload({
      conversion_rates: { ...successPayload().conversion_rates, USD: value }
    }), { now: () => now }), "malformed_payload");
  }

  assertCategory(() => normalizeExchangeRateApiPayload(successPayload({
    conversion_rates: { ...successPayload().conversion_rates, KRW: 1.01 }
  }), { now: () => now }), "malformed_payload");
});

test("ExchangeRate-API adapter classifies HTTP and transport failures without raw payload logging", async () => {
  const httpCases = [
    [301, "redirect_rejected", false],
    [401, "authentication", false],
    [403, "authentication", false],
    [408, "transport", true],
    [429, "quota_or_rate_limit", true],
    [404, "provider_4xx", false],
    [500, "provider_5xx", true]
  ];
  for (const [status, category, retryable] of httpCases) {
    await assert.rejects(() => fetchExchangeRateApiSnapshot({
      env: { [EXCHANGE_RATE_API_SECRET_ENV]: "test-key" },
      now: () => now,
      fetchImpl: async () => mockResponse({ status, body: { result: "error", "error-type": "invalid-key", secret: "secret-value" } })
    }), (error) => {
      assert.equal(error.category, category);
      assert.equal(error.retryable, retryable);
      assert.equal(error.status, status);
      assert.doesNotMatch(error.message, /secret-value|test-key|invalid-key/);
      return true;
    });
  }

  await assert.rejects(() => fetchExchangeRateApiSnapshot({
    env: { [EXCHANGE_RATE_API_SECRET_ENV]: "test-key" },
    fetchImpl: async () => { throw new TypeError("getaddrinfo ENOTFOUND secret-value"); }
  }), (error) => {
    assert.equal(error.category, "transport");
    assert.doesNotMatch(error.message, /secret-value|test-key/);
    return true;
  });
});

test("ExchangeRate-API adapter rejects invalid JSON and oversized responses", async () => {
  await assert.rejects(() => fetchExchangeRateApiSnapshot({
    env: { [EXCHANGE_RATE_API_SECRET_ENV]: "test-key" },
    now: () => now,
    fetchImpl: async () => mockResponse({ body: "not-json" })
  }), /valid JSON/);
  await assert.rejects(() => fetchExchangeRateApiSnapshot({
    env: { [EXCHANGE_RATE_API_SECRET_ENV]: "test-key" },
    now: () => now,
    fetchImpl: async () => mockResponse({ body: "x".repeat(130 * 1024) })
  }), /too large/);
});

test("ExchangeRate-API payload hash is stable for same source snapshot even when fetchedAt differs", () => {
  const first = normalizeExchangeRateApiPayload(successPayload(), { now: () => now, fetchedAt: now });
  const second = normalizeExchangeRateApiPayload(successPayload(), {
    now: () => new Date(now.getTime() + 1000),
    fetchedAt: new Date(now.getTime() + 1000)
  });

  assert.equal(first.sourceEffectiveAt, second.sourceEffectiveAt);
  assert.equal(first.payloadHash, second.payloadHash);
  assert.notEqual(first.fetchedAt, second.fetchedAt);
});
