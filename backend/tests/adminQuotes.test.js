import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { createAdminQuoteService } from "../src/services/adminQuoteService.js";
import { request } from "./testClient.js";

const quoteId = "11111111-1111-4111-8111-111111111111";
const inquiryId = "22222222-2222-4222-8222-222222222222";

function createAppWithQuotes({ duplicate = false } = {}) {
  return createApp({
    env: { nodeEnv: "test", isProduction: false, allowedOrigins: [] },
    services: {
      admin: {
        dashboard: {},
        inquiries: {},
        buyers: {},
        prices: {},
        products: {},
        quotes: createAdminQuoteService({
          queries: {
            async listQuotes(filters) {
              return [{ id: quoteId, inquiryId, status: filters.status || "draft" }];
            },
            async getQuoteById(id) {
              if (id !== quoteId) return null;
              return {
                quote: { id, inquiryId, status: "draft", currency: "JPY" },
                items: [{ id: "item-1", productCode: "NB-001" }]
              };
            },
            async createQuoteFromInquiry(id) {
              if (duplicate) return { conflictQuoteId: quoteId };
              if (id !== inquiryId) return null;
              return {
                quote: { id: quoteId, inquiryId: id, status: "draft" },
                items: [],
                auditLogId: "audit-1"
              };
            },
            async updateQuoteStatus(id, status) {
              if (id !== quoteId) return null;
              return {
                quote: { id, inquiryId, status, currency: "JPY" },
                auditLogId: "audit-status-1"
              };
            },
            async updateWorkflowStatus(id, input) {
              if (id !== quoteId) return null;
              return {
                quote: { id, inquiryId, status: "sent", workflowStatus: input.status, workflowNote: input.note },
                auditLogId: "audit-workflow-1"
              };
            }
          }
        })
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

test("GET /api/admin/quotes returns quote list", async () => {
  const response = await request(createAppWithQuotes(), "/api/admin/quotes?status=draft", {
    headers: { authorization: "Bearer admin-token" }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.quotes[0].status, "draft");
});

test("GET /api/admin/quotes/:quoteId returns quote detail", async () => {
  const response = await request(createAppWithQuotes(), `/api/admin/quotes/${quoteId}`, {
    headers: { authorization: "Bearer admin-token" }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.quote.id, quoteId);
  assert.equal(response.body.data.items[0].productCode, "NB-001");
});

test("POST /api/admin/quotes creates quote draft from inquiry", async () => {
  const response = await request(createAppWithQuotes(), "/api/admin/quotes", {
    method: "POST",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": "application/json"
    },
    body: JSON.stringify({ inquiryId })
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.data.quote.inquiryId, inquiryId);
  assert.equal(response.body.data.auditLogId, "audit-1");
});

test("POST /api/admin/quotes rejects duplicate quote draft", async () => {
  const response = await request(createAppWithQuotes({ duplicate: true }), "/api/admin/quotes", {
    method: "POST",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": "application/json"
    },
    body: JSON.stringify({ inquiryId })
  });

  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, "CONFLICT");
});

test("POST /api/admin/quotes rejects client price fields", async () => {
  const response = await request(createAppWithQuotes(), "/api/admin/quotes", {
    method: "POST",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": "application/json"
    },
    body: JSON.stringify({ inquiryId, confirmedTotal: 1 })
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("PATCH /api/admin/quotes/:quoteId/status cancels a quote", async () => {
  const response = await request(createAppWithQuotes(), `/api/admin/quotes/${quoteId}/status`, {
    method: "PATCH",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": "application/json"
    },
    body: JSON.stringify({ status: "cancelled" })
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.quote.status, "cancelled");
  assert.equal(response.body.data.auditLogId, "audit-status-1");
});

test("PATCH /api/admin/quotes/:quoteId/status rejects unknown fields", async () => {
  const response = await request(createAppWithQuotes(), `/api/admin/quotes/${quoteId}/status`, {
    method: "PATCH",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": "application/json"
    },
    body: JSON.stringify({ status: "cancelled", quotedBy: "client" })
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("PATCH /api/admin/quotes/:quoteId/workflow advances the offline fulfillment workflow", async () => {
  const response = await request(createAppWithQuotes(), `/api/admin/quotes/${quoteId}/workflow`, {
    method: "PATCH",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": "application/json"
    },
    body: JSON.stringify({ status: "receipt_sent", note: "Picking completed from the issued PDF" })
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.quote.workflowStatus, "receipt_sent");
  assert.equal(response.body.data.quote.workflowNote, "Picking completed from the issued PDF");
  assert.equal(response.body.data.auditLogId, "audit-workflow-1");
});

test("PATCH /api/admin/quotes/:quoteId/workflow requires a reason for whole-quote cancellation", async () => {
  const response = await request(createAppWithQuotes(), `/api/admin/quotes/${quoteId}/workflow`, {
    method: "PATCH",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": "application/json"
    },
    body: JSON.stringify({ status: "cancelled" })
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});
