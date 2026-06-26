import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { evaluateFxAutoPolicy } from "../src/fx/fxAutoPriceEngine.js";
import { FX_PRICING_MODES, assertPricingModeAllowed } from "../src/fx/fxAutoPricePolicy.js";
import { calculateDivergenceBps, calculateRateChangeBps, convertKrwToCurrency, isSnapshotFresh, toRateScaled } from "../src/fx/fxMath.js";
import { normalizeFxProviderPayload } from "../src/fx/fxRateNormalizer.js";
import { createAdminFxService } from "../src/services/adminFxService.js";
import { request } from "./testClient.js";

const freshNow = new Date("2026-06-24T00:00:00.000Z");
const freshBundle = {
  provider: "manual",
  sourceEffectiveAt: "2026-06-24T00:00:00.000Z",
  payloadHash: "hash",
  rates: {
    USD: { id: "rate-usd", quoteCurrency: "USD", krwPerUnit: 1000, rateScaled: toRateScaled(1000), sourceEffectiveAt: "2026-06-24T00:00:00.000Z" },
    JPY: { id: "rate-jpy", quoteCurrency: "JPY", krwPerUnit: 10, rateScaled: toRateScaled(10), sourceEffectiveAt: "2026-06-24T00:00:00.000Z" },
    TWD: { id: "rate-TWD", quoteCurrency: "TWD", krwPerUnit: 200, rateScaled: toRateScaled(200), sourceEffectiveAt: "2026-06-24T00:00:00.000Z" }
  }
};

function createFxApp({ adminUser = {}, fxService } = {}) {
  return createApp({
    env: { nodeEnv: "test", isProduction: false, allowedOrigins: [] },
    services: {
      admin: {
        dashboard: {},
        inquiries: {},
        buyers: {},
        prices: {},
        products: {},
        fx: fxService || createAdminFxService({
          queries: {
            async getFxStatus() {
              return { latestRates: [], lastRun: null, priceCounts: { pending_rate: 1 } };
            },
            async listFxRates() {
              return [{ id: "rate-1", quoteCurrency: "USD", krwPerUnit: 1400, sourceEffectiveAt: freshNow.toISOString(), fetchedAt: freshNow.toISOString() }];
            },
            async listFxAutoRuns() {
              return [{ id: "run-1", status: "completed", updateThresholdBps: 500, evaluatedCount: 0 }];
            },
            async listFxAutoPrices() {
              return [{ id: "11111111-1111-4111-8111-111111111111", status: "pending_rate", targetMarket: "US", targetCurrency: "USD", pricingMode: "fx_auto" }];
            },
            async listFxAutoHistory() {
              return [{ id: "event-1", action: "held_deadband" }];
            },
            async importFxRateSnapshotsAndEvaluate() {
              return { insertedCount: 4, run: { id: "run-2" }, auditLogId: "audit-1" };
            },
            async evaluateFxAutoPrices() {
              return { run: { id: "run-3", evaluatedCount: 1 }, auditLogId: "audit-2" };
            },
            async evaluateFxAutoPricesForProduct(productId) {
              return { run: { id: "run-4", productId, evaluatedCount: 1 }, auditLogId: "audit-3" };
            },
            async setProductMarketPricingMode(productId, market, input) {
              return { policy: { id: "policy-1", productId, market, pricingMode: input.pricingMode }, auditLogId: "audit-4" };
            },
            async pauseFxAutoPolicy(id) {
              return { policy: { id, status: "paused" }, auditLogId: "audit-5" };
            },
            async resumeFxAutoPolicy(id) {
              return { policy: { id, status: "pending_rate" }, auditLogId: "audit-6" };
            }
          }
        })
      }
    },
    auth: {
      adminVerifier: { async verifyIdToken() { return { uid: "admin-uid" }; } },
      async loadAdminUserByAuthUid() {
        return { userId: "admin-1", role: "admin", status: "approved", adminRole: "manager", ...adminUser };
      }
    }
  });
}

test("FX provider normalizes KRW per one foreign currency unit", () => {
  const snapshot = normalizeFxProviderPayload({
    provider: "manual",
    baseCurrency: "KRW",
    sourceEffectiveAt: freshNow.toISOString(),
    fetchedAt: freshNow.toISOString(),
    rates: { JPY: 9.1, USD: 1400.5, TWD: 193.2 }
  });

  assert.equal(snapshot.rates.KRW.rateScaled, toRateScaled(1));
  assert.equal(snapshot.rates.JPY.rateScaled, toRateScaled(9.1));
  assert.equal(snapshot.rates.USD.rateScaled, toRateScaled(1400.5));
  assert.match(snapshot.payloadHash, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(snapshot), /password|DATABASE_URL|postgres:\/\//i);
});

test("FX provider rejects unsupported and invalid rates", () => {
  assert.throws(() => normalizeFxProviderPayload({
    provider: "manual",
    baseCurrency: "KRW",
    sourceEffectiveAt: freshNow.toISOString(),
    rates: { JPY: 9, USD: 1400, TWD: 0 }
  }), /Invalid/);
  assert.throws(() => normalizeFxProviderPayload({
    provider: "manual",
    baseCurrency: "KRW",
    sourceEffectiveAt: freshNow.toISOString(),
    rates: { JPY: 9, USD: 1400, TWD: 193, EUR: 1 }
  }), /Unsupported/);
});

test("FX provider rejects incomplete or invalid timestamp bundles before persistence", () => {
  const basePayload = {
    provider: "manual",
    baseCurrency: "KRW",
    sourceEffectiveAt: freshNow.toISOString(),
    fetchedAt: freshNow.toISOString(),
    rates: { JPY: 9, USD: 1400, TWD: 193 }
  };

  assert.throws(() => normalizeFxProviderPayload({
    ...basePayload,
    rates: { JPY: 9, USD: 1400 }
  }, { now: () => freshNow }), /Missing FX rate TWD/);
  assert.throws(() => normalizeFxProviderPayload({
    ...basePayload,
    sourceEffectiveAt: "2026-06-24T00:01:00.000Z",
    fetchedAt: "2026-06-24T00:00:00.000Z"
  }, { now: () => freshNow }), /fetchedAt/);
  assert.throws(() => normalizeFxProviderPayload({
    ...basePayload,
    sourceEffectiveAt: "2026-06-24T00:06:01.000Z",
    fetchedAt: "2026-06-24T00:06:01.000Z"
  }, { now: () => freshNow }), /future/);
  assert.doesNotThrow(() => normalizeFxProviderPayload(basePayload, { now: () => freshNow }));
});

test("FX automatic pricing uses five percent deadband", () => {
  assert.equal(calculateDivergenceBps(100, 104.99), 499);
  assert.equal(calculateDivergenceBps(100, 105), 500);
  assert.equal(calculateDivergenceBps(100, 105.01), 501);

  const baseInput = {
    policy: { pricingMode: FX_PRICING_MODES.FX_AUTO, targetMarket: "US", targetCurrency: "USD", lastAppliedSourcePriceUpdatedAt: "2026-06-23T00:00:00.000Z" },
    sourcePrice: { wholesalePrice: 104990, updatedAt: "2026-06-23T00:00:00.000Z" },
    snapshotBundle: freshBundle,
    thresholds: { updateThresholdBps: 500, circuitBreakerBps: 1500, maxRateAgeHours: 72 },
    now: freshNow
  };

  assert.equal(evaluateFxAutoPolicy({ ...baseInput, publishedPrice: { wholesalePrice: 100 } }).status, "held_deadband");
  assert.equal(evaluateFxAutoPolicy({ ...baseInput, sourcePrice: { wholesalePrice: 105000, updatedAt: "2026-06-23T00:00:00.000Z" }, publishedPrice: { wholesalePrice: 100 } }).status, "updated");
});

test("FX automatic pricing blocks rate movement at fifteen percent and above", () => {
  assert.equal(calculateRateChangeBps(toRateScaled(100), toRateScaled(114.99)), 1499);
  assert.equal(calculateRateChangeBps(toRateScaled(100), toRateScaled(115)), 1500);
  const input = {
    policy: { pricingMode: FX_PRICING_MODES.FX_AUTO, targetMarket: "US", targetCurrency: "USD", lastAppliedRateScaled: toRateScaled(1000), lastAppliedSourcePriceUpdatedAt: "2026-06-23T00:00:00.000Z" },
    sourcePrice: { wholesalePrice: 115000, updatedAt: "2026-06-23T00:00:00.000Z" },
    publishedPrice: { wholesalePrice: 100 },
    snapshotBundle: {
      ...freshBundle,
      rates: { ...freshBundle.rates, USD: { ...freshBundle.rates.USD, rateScaled: toRateScaled(1150), krwPerUnit: 1150 } }
    },
    thresholds: { updateThresholdBps: 500, circuitBreakerBps: 1500, maxRateAgeHours: 72 },
    now: freshNow
  };
  assert.equal(evaluateFxAutoPolicy(input).status, "blocked_spike");
});

test("FX automatic pricing freshness uses sourceEffectiveAt, not fetchedAt", () => {
  assert.equal(isSnapshotFresh("2026-06-21T00:01:00.000Z", freshNow, 72), true);
  assert.equal(isSnapshotFresh("2026-06-20T23:59:00.000Z", freshNow, 72), false);
  assert.equal(isSnapshotFresh("2026-06-24T00:06:00.000Z", freshNow, 72), false);

  const stale = {
    ...freshBundle,
    sourceEffectiveAt: "2026-06-20T23:59:00.000Z",
    rates: { ...freshBundle.rates, USD: { ...freshBundle.rates.USD, sourceEffectiveAt: "2026-06-20T23:59:00.000Z" } }
  };
  assert.equal(evaluateFxAutoPolicy({
    policy: { pricingMode: FX_PRICING_MODES.FX_AUTO, targetMarket: "US", targetCurrency: "USD" },
    sourcePrice: { wholesalePrice: 100000, updatedAt: "2026-06-23T00:00:00.000Z" },
    snapshotBundle: stale,
    thresholds: { updateThresholdBps: 500, circuitBreakerBps: 1500, maxRateAgeHours: 72 },
    now: freshNow
  }).status, "blocked_stale");
});

test("manual fixed and manual-only markets are protected from automatic updates", () => {
  const manualResult = evaluateFxAutoPolicy({
    policy: { pricingMode: FX_PRICING_MODES.MANUAL_FIXED, targetMarket: "US", targetCurrency: "USD" },
    sourcePrice: { wholesalePrice: 100000 },
    publishedPrice: { wholesalePrice: 50 },
    snapshotBundle: freshBundle
  });
  assert.equal(manualResult.action, "reference_updated");
  assert.equal(manualResult.status, "active");
  assert.equal(manualResult.reference.wholesalePrice, 100);

  assert.throws(() => assertPricingModeAllowed({ market: "KR", currency: "KRW", pricingMode: FX_PRICING_MODES.FX_AUTO }), /only allowed/);
  assert.throws(() => assertPricingModeAllowed({ market: "GLOBAL", currency: "USD", pricingMode: FX_PRICING_MODES.FX_AUTO }), /only allowed/);
});

test("paused FX automatic policy exposes reference but blocks price application", () => {
  const result = evaluateFxAutoPolicy({
    policy: { pricingMode: FX_PRICING_MODES.FX_AUTO, status: "paused", targetMarket: "US", targetCurrency: "USD" },
    sourcePrice: { wholesalePrice: 100000, updatedAt: "2026-06-23T00:00:00.000Z" },
    publishedPrice: { wholesalePrice: 50 },
    snapshotBundle: freshBundle,
    thresholds: { updateThresholdBps: 500, circuitBreakerBps: 1500, maxRateAgeHours: 72 },
    now: freshNow
  });
  assert.equal(result.action, "paused");
  assert.equal(result.status, "paused");
  assert.equal(result.reference.wholesalePrice, 100);
});

test("FX conversion respects currency minor units", () => {
  assert.equal(convertKrwToCurrency(11000, toRateScaled(10), "JPY"), 1100);
  assert.equal(convertKrwToCurrency(11000, toRateScaled(1250), "USD"), 8.8);
});

test("admin FX read routes require prices.read", async () => {
  const response = await request(createFxApp({
    adminUser: { permissionOverrides: [{ permissionKey: "prices.read", effect: "deny" }] }
  }), "/api/admin/fx/status", {
    headers: { authorization: "Bearer admin-token" }
  });

  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, "FORBIDDEN");
});

test("admin FX read routes return sanitized automatic pricing data", async () => {
  const response = await request(createFxApp(), "/api/admin/fx/prices", {
    headers: { authorization: "Bearer admin-token" }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.prices[0].pricingMode, "fx_auto");
  assert.doesNotMatch(JSON.stringify(response.body), /postgres:\/\/|DATABASE_URL|password/i);
});

test("admin FX write routes require prices.write", async () => {
  const response = await request(createFxApp({
    adminUser: { permissionOverrides: [{ permissionKey: "prices.write", effect: "deny" }] }
  }), "/api/admin/fx/evaluate", {
    method: "POST",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": "application/json"
    },
    body: JSON.stringify({ updateThresholdBps: 500 })
  });

  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, "FORBIDDEN");
});

test("admin FX evaluate rejects API threshold overrides", async () => {
  const response = await request(createFxApp(), "/api/admin/fx/evaluate", {
    method: "POST",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": "application/json"
    },
    body: JSON.stringify({ updateThresholdBps: 1 })
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("admin FX manual fixed mode accepts validated manual price payload", async () => {
  let capturedInput = null;
  const fxService = createAdminFxService({
    queries: {
      async setProductMarketPricingMode(productId, market, input) {
        capturedInput = { productId, market, ...input };
        return { policy: { id: "policy-1", productId, market, pricingMode: input.pricingMode }, auditLogId: "audit-1" };
      }
    }
  });
  const response = await request(createFxApp({ fxService }), "/api/admin/fx/products/11111111-1111-4111-8111-111111111111/markets/US/mode", {
    method: "PUT",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      pricingMode: "manual_fixed",
      currency: "USD",
      wholesalePrice: "8.80",
      retailPrice: "9.90",
      moq: 2,
      minOrderAmount: "20.00",
      isActive: false
    })
  });

  assert.equal(response.status, 200);
  assert.equal(capturedInput.productId, "11111111-1111-4111-8111-111111111111");
  assert.equal(capturedInput.market, "US");
  assert.equal(capturedInput.manualPrice.wholesalePrice, 8.8);
  assert.equal(capturedInput.manualPrice.retailPrice, 9.9);
  assert.equal(capturedInput.manualPrice.moq, 2);
  assert.equal(capturedInput.manualPrice.minOrderAmount, 20);
  assert.equal(capturedInput.manualPrice.isActive, false);
});

test("admin FX approve and reject draft routes are removed", async () => {
  const app = createFxApp();
  for (const path of [
    "/api/admin/fx/drafts/11111111-1111-4111-8111-111111111111/approve",
    "/api/admin/fx/drafts/11111111-1111-4111-8111-111111111111/reject",
    "/api/admin/fx/review-runs"
  ]) {
    const response = await request(app, path, {
      method: "POST",
      headers: { authorization: "Bearer admin-token" }
    });
    assert.equal(response.status, 404);
  }
});
