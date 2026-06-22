import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { createAdminPriceService } from "../src/services/adminPriceService.js";
import { request } from "./testClient.js";

function createAppWithPrices() {
  return createApp({
    env: { nodeEnv: "test", isProduction: false, allowedOrigins: [] },
    services: {
      admin: {
        dashboard: {},
        inquiries: {},
        buyers: {},
        prices: createAdminPriceService({
          queries: {
            async listPrices(filters) {
              return [
                {
                  id: "price-1",
                  productCode: "NB-001",
                  market: filters.market || "JP",
                  isActive: filters.active ?? true
                }
              ];
            },
            async createPrice(input) {
              if (input.productCode === "MISSING") return { missingProduct: true };
              if (input.productCode === "DUP") return { conflict: "product_market" };
              return {
                price: {
                  id: "11111111-1111-4111-8111-111111111111",
                  productCode: input.productCode,
                  market: input.market,
                  currency: input.currency,
                  wholesalePrice: input.wholesalePrice,
                  moq: input.moq,
                  isActive: input.isActive
                },
                auditLogId: "audit-create-1"
              };
            },
            async updatePrice(id, input) {
              if (id !== "11111111-1111-4111-8111-111111111111") return null;
              return {
                price: {
                  id,
                  productCode: "NB-001",
                  market: "JP",
                  currency: input.currency || "JPY",
                  wholesalePrice: input.wholesalePrice ?? 1200,
                  moq: input.moq ?? 20,
                  isActive: input.isActive ?? true
                },
                auditLogId: "audit-update-1"
              };
            }
          }
        }),
        products: {}
      }
    },
    auth: {
      adminVerifier: { async verifyIdToken() { return { uid: "admin-uid" }; } },
      async loadAdminUserByAuthUid() {
        return { userId: "admin-1", role: "admin", status: "approved", adminRole: "manager" };
      }
    }
  });
}

test("GET /api/admin/prices returns price rows", async () => {
  const response = await request(createAppWithPrices(), "/api/admin/prices", {
    headers: { authorization: "Bearer admin-token" }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.prices.length, 1);
  assert.equal(response.body.data.prices[0].productCode, "NB-001");
});

test("GET /api/admin/prices allows market and active filters", async () => {
  const response = await request(createAppWithPrices(), "/api/admin/prices?market=JP&active=false", {
    headers: { authorization: "Bearer admin-token" }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.prices[0].market, "JP");
  assert.equal(response.body.data.prices[0].isActive, false);
});

test("GET /api/admin/prices rejects invalid market", async () => {
  const response = await request(createAppWithPrices(), "/api/admin/prices?market=EU", {
    headers: { authorization: "Bearer admin-token" }
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("POST /api/admin/prices creates price row", async () => {
  const response = await request(createAppWithPrices(), "/api/admin/prices", {
    method: "POST",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      productCode: "NB-001",
      market: "JP",
      currency: "JPY",
      wholesalePrice: 1200,
      moq: 20
    })
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.data.price.productCode, "NB-001");
  assert.equal(response.body.data.auditLogId, "audit-create-1");
});

test("POST /api/admin/prices rejects unknown product code", async () => {
  const response = await request(createAppWithPrices(), "/api/admin/prices", {
    method: "POST",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      productCode: "MISSING",
      market: "JP",
      currency: "JPY",
      wholesalePrice: 1200,
      moq: 20
    })
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("POST /api/admin/prices rejects duplicate market price", async () => {
  const response = await request(createAppWithPrices(), "/api/admin/prices", {
    method: "POST",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      productCode: "DUP",
      market: "JP",
      currency: "JPY",
      wholesalePrice: 1200,
      moq: 20
    })
  });

  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, "CONFLICT");
});

test("PATCH /api/admin/prices/:priceId updates price row", async () => {
  const response = await request(
    createAppWithPrices(),
    "/api/admin/prices/11111111-1111-4111-8111-111111111111",
    {
      method: "PATCH",
      headers: {
        authorization: "Bearer admin-token",
        "content-type": "application/json"
      },
      body: JSON.stringify({ wholesalePrice: 1300, isActive: false })
    }
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.data.price.wholesalePrice, 1300);
  assert.equal(response.body.data.price.isActive, false);
  assert.equal(response.body.data.auditLogId, "audit-update-1");
});

test("PATCH /api/admin/prices/:priceId rejects product and market mutation", async () => {
  const response = await request(
    createAppWithPrices(),
    "/api/admin/prices/11111111-1111-4111-8111-111111111111",
    {
      method: "PATCH",
      headers: {
        authorization: "Bearer admin-token",
        "content-type": "application/json"
      },
      body: JSON.stringify({ productCode: "NB-002", market: "US" })
    }
  );

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});
