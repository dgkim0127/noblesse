import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { calculateRateChangeBps, convertPublishedAmountByFxChange, isRateMovementDraftable, toRateScaled } from "../src/fx/fxMath.js";
import { normalizeFxProviderPayload } from "../src/fx/fxRateNormalizer.js";
import { createAdminFxService } from "../src/services/adminFxService.js";
import { request } from "./testClient.js";

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
              return { latestRates: [], lastReviewRun: null, draftCounts: { pending: 1 } };
            },
            async listFxRates() {
              return [{ id: "rate-1", quoteCurrency: "USD", krwPerUnit: 1400, fetchedAt: new Date().toISOString() }];
            },
            async listFxReviewRuns() {
              return [{ id: "run-1", status: "completed", thresholdBps: 200, draftCount: 0 }];
            },
            async listFxDrafts() {
              return [{ id: "11111111-1111-4111-8111-111111111111", status: "pending", targetMarket: "US", targetCurrency: "USD", proposedAmount: 8.8 }];
            },
            async importFxRateSnapshots() {
              return { insertedCount: 4, auditLogId: "audit-1" };
            },
            async createFxReviewRun(input) {
              return { reviewRun: { id: "run-1", thresholdBps: input.thresholdBps, draftCount: 0 }, auditLogId: "audit-2" };
            },
            async approveFxDraft(id) {
              return { draft: { id, status: "approved" }, auditLogId: "audit-3" };
            },
            async rejectFxDraft(id, input) {
              return { draft: { id, status: "rejected", reason: input.reason }, auditLogId: "audit-4" };
            },
            async setProductPriceFxManaged(id, enabled) {
              return { price: { id, fxManaged: enabled }, auditLogId: "audit-5" };
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
    sourceEffectiveAt: "2026-06-24T00:00:00.000Z",
    fetchedAt: "2026-06-24T00:01:00.000Z",
    rates: { JPY: 9.1, USD: 1400.5, CNY: 193.2 }
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
    sourceEffectiveAt: "2026-06-24T00:00:00.000Z",
    rates: { JPY: 9, USD: 1400, CNY: 0 }
  }), /Invalid/);
  assert.throws(() => normalizeFxProviderPayload({
    provider: "manual",
    baseCurrency: "KRW",
    sourceEffectiveAt: "2026-06-24T00:00:00.000Z",
    rates: { JPY: 9, USD: 1400, CNY: 193, EUR: 1 }
  }), /Unsupported/);
});

test("FX threshold creates drafts at two percent and above only", () => {
  const anchor = toRateScaled(100);
  assert.equal(calculateRateChangeBps(anchor, toRateScaled(101.99)), 199);
  assert.equal(isRateMovementDraftable(anchor, toRateScaled(101.99)), false);
  assert.equal(calculateRateChangeBps(anchor, toRateScaled(102)), 200);
  assert.equal(isRateMovementDraftable(anchor, toRateScaled(102)), true);
  assert.equal(isRateMovementDraftable(anchor, toRateScaled(97.99)), true);
});

test("FX update preserves implied KRW value using currency precision", () => {
  const nextUsd = convertPublishedAmountByFxChange(10, toRateScaled(1400), toRateScaled(1500), "USD");
  const nextJpy = convertPublishedAmountByFxChange(1000, toRateScaled(9), toRateScaled(8), "JPY");

  assert.equal(nextUsd, 9.33);
  assert.equal(nextJpy, 1125);
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

test("admin FX read routes return sanitized data", async () => {
  const response = await request(createFxApp(), "/api/admin/fx/rates", {
    headers: { authorization: "Bearer admin-token" }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.rates[0].quoteCurrency, "USD");
  assert.equal(response.body.data.rates[0].isStale, false);
});

test("admin FX write routes require prices.write", async () => {
  const response = await request(createFxApp({
    adminUser: { permissionOverrides: [{ permissionKey: "prices.write", effect: "deny" }] }
  }), "/api/admin/fx/review-runs", {
    method: "POST",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": "application/json"
    },
    body: JSON.stringify({ thresholdBps: 200 })
  });

  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, "FORBIDDEN");
});

test("admin FX approval route is the only route that approves drafts", async () => {
  const response = await request(
    createFxApp(),
    "/api/admin/fx/drafts/11111111-1111-4111-8111-111111111111/approve",
    {
      method: "POST",
      headers: { authorization: "Bearer admin-token" }
    }
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.data.draft.status, "approved");
  assert.equal(response.body.data.auditLogId, "audit-3");
});

test("admin FX reject route requires a reason and does not publish a price", async () => {
  const response = await request(
    createFxApp(),
    "/api/admin/fx/drafts/11111111-1111-4111-8111-111111111111/reject",
    {
      method: "POST",
      headers: {
        authorization: "Bearer admin-token",
        "content-type": "application/json"
      },
      body: JSON.stringify({ reason: "Manual market review" })
    }
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.data.draft.status, "rejected");
  assert.equal(response.body.data.draft.reason, "Manual market review");
});
