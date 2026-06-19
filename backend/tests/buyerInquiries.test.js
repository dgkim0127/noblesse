import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { createBuyerInquiryService } from "../src/services/buyerInquiryService.js";
import { createBuyerService } from "../src/services/buyerService.js";
import { request } from "./testClient.js";

const inquiryId = "11111111-1111-4111-8111-111111111111";

const verifier = {
  async verifyIdToken(token) {
    if (token !== "valid-token") {
      throw new Error("Invalid token");
    }
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
    buyerId: "buyer-1",
    companyName: "Noblesse Buyer",
    country: "JP",
    assignedMarket: "JP",
    currency: "JPY",
    discountRate: 0,
    minOrderAmount: 0,
    ...overrides
  };
}

function createBuyerInquiryApp({ viewer = createBuyerViewer(), queriesOverrides = {} } = {}) {
  const queries = {
    async listProductPrices(currentViewer) {
      assert.equal(currentViewer.buyerId, viewer.buyerId);
      return [
        {
          productId: "NB-001",
          productCode: "NB-001",
          market: "JP",
          currency: "JPY",
          wholesalePrice: 1200,
          moq: 20,
          visibleTo: "approved_only",
          isActive: true
        }
      ];
    },
    async listInquiries(currentViewer, filters) {
      assert.equal(currentViewer.buyerId, viewer.buyerId);
      return [
        {
          inquiryId,
          inquiryNumber: "INQ-001",
          status: filters.status || "requested",
          totalItems: 1,
          totalQuantity: 20,
          estimatedTotal: 24000,
          currency: "JPY",
          items: []
        }
      ];
    },
    async getInquiryById(currentViewer, id) {
      assert.equal(currentViewer.buyerId, viewer.buyerId);
      if (id !== inquiryId) return null;
      return {
        inquiryId,
        inquiryNumber: "INQ-001",
        status: "requested",
        totalItems: 1,
        totalQuantity: 20,
        estimatedTotal: 24000,
        currency: "JPY",
        items: [{ productCode: "NB-001", quantity: 20, subtotal: 24000 }]
      };
    },
    async createInquiry(currentViewer, input) {
      assert.equal(currentViewer.buyerId, viewer.buyerId);
      return {
        inquiryId,
        inquiryNumber: "INQ-001",
        status: "requested",
        totalItems: input.items.length,
        totalQuantity: input.items[0].quantity,
        estimatedTotal: 24000,
        currency: "JPY",
        requestMemo: input.requestMemo,
        items: [{ productCode: input.items[0].productCode, quantity: input.items[0].quantity, subtotal: 24000 }]
      };
    },
    ...queriesOverrides
  };

  return createApp({
    env: { nodeEnv: "test", isProduction: false, allowedOrigins: [] },
    services: {
      buyer: createBuyerService(),
      buyerInquiries: createBuyerInquiryService({ queries })
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

test("GET /api/buyer/product-prices requires approved buyer", async () => {
  const app = createBuyerInquiryApp({ viewer: createBuyerViewer({ status: "pending" }) });
  const response = await request(app, "/api/buyer/product-prices", { headers: authHeaders() });

  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, "FORBIDDEN");
});

test("GET /api/buyer/product-prices returns buyer market prices", async () => {
  const app = createBuyerInquiryApp();
  const response = await request(app, "/api/buyer/product-prices", { headers: authHeaders() });

  assert.equal(response.status, 200);
  assert.equal(response.body.productPrices[0].productCode, "NB-001");
  assert.equal(response.body.productPrices[0].visibleTo, "approved_only");
});

test("GET /api/buyer/inquiries returns only current buyer inquiries", async () => {
  const app = createBuyerInquiryApp();
  const response = await request(app, "/api/buyer/inquiries?status=requested", { headers: authHeaders() });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.inquiries[0].inquiryId, inquiryId);
  assert.equal(response.body.data.inquiries[0].status, "requested");
  assert.equal(response.body.meta.requestId, response.headers.get("x-request-id"));
});

test("GET /api/buyer/inquiries/:inquiryId validates ownership result", async () => {
  const app = createBuyerInquiryApp();
  const response = await request(app, `/api/buyer/inquiries/${inquiryId}`, { headers: authHeaders() });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.inquiry.items[0].productCode, "NB-001");
});

test("GET /api/buyer/inquiries/:inquiryId rejects invalid id", async () => {
  const app = createBuyerInquiryApp();
  const response = await request(app, "/api/buyer/inquiries/not-a-uuid", { headers: authHeaders() });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("POST /api/buyer/inquiries rejects client owner and price fields", async () => {
  const app = createBuyerInquiryApp();
  const response = await request(app, "/api/buyer/inquiries", {
    method: "POST",
    headers: { ...authHeaders(), "content-type": "application/json" },
    body: JSON.stringify({
      buyerId: "attacker",
      items: [{ productCode: "NB-001", quantity: 20, priceSnapshot: 1 }]
    })
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("POST /api/buyer/inquiries creates requested inquiry", async () => {
  const app = createBuyerInquiryApp();
  const response = await request(app, "/api/buyer/inquiries", {
    method: "POST",
    headers: { ...authHeaders(), "content-type": "application/json" },
    body: JSON.stringify({
      requestMemo: "Please check stock",
      items: [{ productCode: "NB-001", color: "Silver", size: "6mm", quantity: 20 }]
    })
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.data.inquiry.inquiryId, inquiryId);
  assert.equal(response.body.data.inquiry.requestMemo, "Please check stock");
  assert.equal(response.body.data.inquiry.items[0].productCode, "NB-001");
});
