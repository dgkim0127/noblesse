import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { request } from "./testClient.js";

function createAnalyticsApp() {
  return createApp({
    env: { nodeEnv: "test", isProduction: false, allowedOrigins: [] },
    services: {
      admin: {
        analytics: {
          async getAnalytics() {
            return {
              overview: { openInquiries: 2, draftQuotes: 1, awaitingBuyer: 1, acceptedQuotes: 0 },
              inquiries: { total: 2, statuses: [] },
              quotes: { total: 2, issued: 1, statuses: [] },
              currencyTotals: [{ currency: "KRW", requestedTotal: 12000, issuedTotal: 0 }]
            };
          }
        }
      }
    },
    auth: {
      adminVerifier: {
        async verifyIdToken() {
          return { uid: "analytics-admin-uid", email: "admin@example.test" };
        }
      },
      async loadAdminUserByAuthUid() {
        return {
          userId: "analytics-admin-1",
          authUid: "analytics-admin-uid",
          email: "admin@example.test",
          role: "admin",
          adminRole: "operator",
          status: "approved"
        };
      }
    }
  });
}

test("GET /api/admin/analytics returns protected server aggregates", async () => {
  const response = await request(createAnalyticsApp(), "/api/admin/analytics", {
    headers: { authorization: "Bearer admin-token" }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.overview.openInquiries, 2);
  assert.equal(response.body.data.quotes.issued, 1);
  assert.equal(response.body.data.currencyTotals[0].currency, "KRW");
  assert.equal(response.body.meta.requestId, response.headers.get("x-request-id"));
});

test("GET /api/admin/analytics rejects requests without admin authentication", async () => {
  const response = await request(createAnalyticsApp(), "/api/admin/analytics");

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, "UNAUTHORIZED");
});
