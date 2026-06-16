import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { createAdminInquiryService } from "../src/services/adminInquiryService.js";
import { request } from "./testClient.js";

function createAppWithInquiries() {
  return createApp({
    env: { nodeEnv: "test", isProduction: false, allowedOrigins: [] },
    services: {
      admin: {
        dashboard: {},
        inquiries: createAdminInquiryService({
          queries: {
            async listInquiries(filters) {
              return [
                {
                  id: "11111111-1111-4111-8111-111111111111",
                  inquiryNumber: "INQ-001",
                  status: filters.status || "requested"
                }
              ];
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

test("GET /api/admin/inquiries returns inquiry list", async () => {
  const response = await request(createAppWithInquiries(), "/api/admin/inquiries", {
    headers: { authorization: "Bearer admin-token" }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.inquiries.length, 1);
  assert.equal(response.body.data.inquiries[0].inquiryNumber, "INQ-001");
});

test("GET /api/admin/inquiries allows current inquiry status filter", async () => {
  const response = await request(createAppWithInquiries(), "/api/admin/inquiries?status=requested", {
    headers: { authorization: "Bearer admin-token" }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.inquiries[0].status, "requested");
});

test("GET /api/admin/inquiries rejects invalid status filter", async () => {
  const response = await request(createAppWithInquiries(), "/api/admin/inquiries?status=new", {
    headers: { authorization: "Bearer admin-token" }
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});
