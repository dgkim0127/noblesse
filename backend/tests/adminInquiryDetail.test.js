import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { createAdminInquiryService } from "../src/services/adminInquiryService.js";
import { notFound } from "../src/utils/errors.js";
import { request } from "./testClient.js";

const inquiryId = "11111111-1111-4111-8111-111111111111";

function createAppWithInquiryDetail() {
  return createApp({
    env: { nodeEnv: "test", isProduction: false, allowedOrigins: [] },
    services: {
      admin: {
        dashboard: {},
        inquiries: createAdminInquiryService({
          queries: {
            async getInquiryById(id) {
              if (id !== inquiryId) {
                return null;
              }
              return {
                inquiry: { id, inquiryNumber: "INQ-001", status: "requested" },
                buyer: { id: "buyer-1", companyName: "Noblesse Buyer" },
                items: []
              };
            }
          }
        }),
        buyers: {},
        products: {}
      }
    },
    auth: {
      adminVerifier: { async verifyIdToken() { return { uid: "admin-uid" }; } },
      async loadAdminUserByAuthUid() {
        return { userId: "admin-1", role: "admin", status: "approved" };
      }
    }
  });
}

test("GET /api/admin/inquiries/:inquiryId returns inquiry detail", async () => {
  const response = await request(createAppWithInquiryDetail(), `/api/admin/inquiries/${inquiryId}`, {
    headers: { authorization: "Bearer admin-token" }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.inquiry.id, inquiryId);
});

test("GET /api/admin/inquiries/:inquiryId rejects invalid UUID", async () => {
  const response = await request(createAppWithInquiryDetail(), "/api/admin/inquiries/not-a-uuid", {
    headers: { authorization: "Bearer admin-token" }
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("GET /api/admin/inquiries/:inquiryId returns NOT_FOUND", async () => {
  const response = await request(
    createAppWithInquiryDetail(),
    "/api/admin/inquiries/22222222-2222-4222-8222-222222222222",
    { headers: { authorization: "Bearer admin-token" } }
  );

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, "NOT_FOUND");
});
