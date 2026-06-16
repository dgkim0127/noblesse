import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { createAdminBuyerService } from "../src/services/adminBuyerService.js";
import { request } from "./testClient.js";

function createAppWithBuyers() {
  return createApp({
    env: { nodeEnv: "test", isProduction: false, allowedOrigins: [] },
    services: {
      admin: {
        dashboard: {},
        inquiries: {},
        buyers: createAdminBuyerService({
          queries: {
            async listBuyers(filters) {
              return [
                {
                  id: "buyer-1",
                  email: "buyer@example.test",
                  status: filters.status || "pending"
                }
              ];
            }
          }
        }),
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

test("GET /api/admin/buyers returns buyers list", async () => {
  const response = await request(createAppWithBuyers(), "/api/admin/buyers", {
    headers: { authorization: "Bearer admin-token" }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.buyers.length, 1);
});

test("GET /api/admin/buyers allows current buyer status filters", async () => {
  for (const status of ["pending", "approved", "blocked"]) {
    const response = await request(createAppWithBuyers(), `/api/admin/buyers?status=${status}`, {
      headers: { authorization: "Bearer admin-token" }
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.buyers[0].status, status);
  }
});

test("GET /api/admin/buyers rejects invalid status filter", async () => {
  const response = await request(createAppWithBuyers(), "/api/admin/buyers?status=rejected", {
    headers: { authorization: "Bearer admin-token" }
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});
