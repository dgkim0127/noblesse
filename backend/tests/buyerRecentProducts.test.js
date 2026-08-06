import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { createBuyerRecentProductService } from "../src/services/buyerRecentProductService.js";
import { request } from "./testClient.js";

const verifier = {
  async verifyIdToken(token) {
    if (token !== "valid-token") throw new Error("Invalid token");
    return { uid: "buyer-uid", email: "buyer@example.test" };
  }
};

function createBuyerViewer(overrides = {}) {
  return {
    userId: "user-1",
    authUid: "buyer-uid",
    email: "buyer@example.test",
    role: "buyer",
    status: "approved",
    accountStatus: "active",
    verificationStatus: "approved",
    buyerId: "buyer-1",
    companyName: "Noblesse Buyer",
    assignedMarket: "KR",
    currency: "KRW",
    ...overrides
  };
}

function createRecentProductApp({ viewer = createBuyerViewer(), queriesOverrides = {} } = {}) {
  const queries = {
    async listRecentProducts(currentViewer, policy) {
      assert.equal(currentViewer.buyerId, viewer.buyerId);
      assert.deepEqual(policy, { limit: 10, retentionDays: 90 });
      return [{ productCode: "NB-RECENT-1", viewedAt: "2026-08-06T00:00:00.000Z" }];
    },
    async recordProductView(currentViewer, productCode, policy) {
      assert.equal(currentViewer.buyerId, viewer.buyerId);
      assert.deepEqual(policy, { limit: 10, retentionDays: 90 });
      return { productCode, viewedAt: "2026-08-06T00:00:00.000Z" };
    },
    ...queriesOverrides
  };

  return createApp({
    env: { nodeEnv: "test", isProduction: false, allowedOrigins: [] },
    services: {
      buyerRecentProducts: createBuyerRecentProductService({ queries })
    },
    auth: {
      verifier,
      async loadViewer() {
        return viewer;
      }
    }
  });
}

function authHeaders() {
  return { authorization: "Bearer valid-token" };
}

test("GET /api/buyer/recent-products returns only the current buyer history", async () => {
  const response = await request(createRecentProductApp(), "/api/buyer/recent-products", {
    headers: authHeaders()
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.body.data.recentProducts[0].productCode, "NB-RECENT-1");
  assert.equal(response.body.meta.requestId, response.headers.get("x-request-id"));
});

test("PUT /api/buyer/recent-products/:productCode normalizes and records the product", async () => {
  const response = await request(
    createRecentProductApp(),
    "/api/buyer/recent-products/nb-recent-1",
    { method: "PUT", headers: authHeaders() }
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.body.data.recentProduct.productCode, "NB-RECENT-1");
});

test("recent products reject admin and restricted buyer accounts", async () => {
  for (const viewer of [
    createBuyerViewer({ role: "admin", buyerId: null }),
    createBuyerViewer({ accountStatus: "blocked" }),
    createBuyerViewer({ verificationStatus: "rejected" }),
    createBuyerViewer({ verificationStatus: "suspended" })
  ]) {
    const response = await request(createRecentProductApp({ viewer }), "/api/buyer/recent-products", {
      headers: authHeaders()
    });
    assert.equal(response.status, 403);
    assert.equal(response.body.error.code, "FORBIDDEN");
  }
});

test("recent product recording rejects invalid or unavailable products", async () => {
  const invalidResponse = await request(
    createRecentProductApp(),
    "/api/buyer/recent-products/%20",
    { method: "PUT", headers: authHeaders() }
  );
  assert.equal(invalidResponse.status, 400);

  const unavailableResponse = await request(
    createRecentProductApp({
      queriesOverrides: {
        async recordProductView() {
          return null;
        }
      }
    }),
    "/api/buyer/recent-products/NB-HIDDEN",
    { method: "PUT", headers: authHeaders() }
  );
  assert.equal(unavailableResponse.status, 404);
  assert.equal(unavailableResponse.body.error.code, "NOT_FOUND");
});
