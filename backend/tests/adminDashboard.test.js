import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { request } from "./testClient.js";

function createAppWithDashboard() {
  return createApp({
    env: { nodeEnv: "test", isProduction: false, allowedOrigins: [] },
    services: {
      admin: {
        dashboard: {
          async getDashboard() {
            return {
              inquiries: { total: 3, requested: 1 },
              buyers: { total: 2, pending: 1 },
              products: { total: 5, visible: 4 },
              manualFollowUp: { label: "Manual follow-up required", count: 1 }
            };
          }
        },
        inquiries: {},
        buyers: {},
        products: {}
      }
    },
    auth: {
      adminVerifier: {
        async verifyIdToken() {
          return { uid: "admin-uid", email: "admin@example.test" };
        }
      },
      async loadAdminUserByAuthUid() {
        return {
          userId: "admin-1",
          authUid: "admin-uid",
          email: "admin@example.test",
          role: "admin",
          status: "approved"
        };
      }
    }
  });
}

test("GET /api/admin/dashboard returns summary data for approved admin", async () => {
  const response = await request(createAppWithDashboard(), "/api/admin/dashboard", {
    headers: { authorization: "Bearer admin-token" }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.inquiries.total, 3);
  assert.equal(response.body.data.buyers.total, 2);
  assert.equal(response.body.data.products.total, 5);
  assert.equal(response.body.meta.requestId, response.headers.get("x-request-id"));
});
