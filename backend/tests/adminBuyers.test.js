import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { createAdminBuyerService } from "../src/services/adminBuyerService.js";
import { request } from "./testClient.js";

function createAppWithBuyers() {
  const buyerId = "11111111-1111-4111-8111-111111111111";
  return createApp({
    env: { nodeEnv: "test", isProduction: false, allowedOrigins: [] },
    services: {
      admin: {
        dashboard: {},
        inquiries: {},
        buyers: createAdminBuyerService({
          queries: {
            async listBuyers(filters) {
              return Array.from({ length: filters.dbLimit || filters.limit }, (_, index) => ({
                id: index === 0 ? buyerId : `11111111-1111-4111-8111-11111111111${index}`,
                email: `buyer-${index}@example.test`,
                status: filters.status || "pending"
              }));
            },
            async getBuyerById(id) {
              if (id !== buyerId) return null;
              return {
                buyer: {
                  id,
                  email: "buyer@example.test",
                  status: "pending",
                  companyName: "Buyer Co"
                },
                agreements: [],
                recentInquiries: []
              };
            },
            async updateBuyerStatus(id, status) {
              if (id !== buyerId) return null;
              return {
                buyer: {
                  id,
                  email: "buyer@example.test",
                  status
                },
                auditLogId: "audit-1"
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

test("GET /api/admin/buyers returns buyers list", async () => {
  const response = await request(createAppWithBuyers(), "/api/admin/buyers", {
    headers: { authorization: "Bearer admin-token" }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.buyers.length, 20);
  assert.equal(response.body.meta.limit, 20);
  assert.equal(response.body.meta.offset, 0);
  assert.equal(response.body.meta.nextOffset, 20);
  assert.equal(response.body.meta.nextCursor, "20");
});

test("GET /api/admin/buyers trims lookahead row for paginated lists", async () => {
  const response = await request(createAppWithBuyers(), "/api/admin/buyers?limit=2&offset=4", {
    headers: { authorization: "Bearer admin-token" }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.buyers.length, 2);
  assert.equal(response.body.meta.limit, 2);
  assert.equal(response.body.meta.offset, 4);
  assert.equal(response.body.meta.nextOffset, 6);
  assert.equal(response.body.meta.nextCursor, "6");
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

test("GET /api/admin/buyers/:buyerId returns buyer detail", async () => {
  const response = await request(
    createAppWithBuyers(),
    "/api/admin/buyers/11111111-1111-4111-8111-111111111111",
    {
      headers: { authorization: "Bearer admin-token" }
    }
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.data.buyer.companyName, "Buyer Co");
  assert.deepEqual(response.body.data.agreements, []);
  assert.deepEqual(response.body.data.recentInquiries, []);
});

test("GET /api/admin/buyers/:buyerId rejects invalid buyer id", async () => {
  const response = await request(createAppWithBuyers(), "/api/admin/buyers/not-a-uuid", {
    headers: { authorization: "Bearer admin-token" }
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("GET /api/admin/buyers/:buyerId returns NOT_FOUND for unknown buyer", async () => {
  const response = await request(
    createAppWithBuyers(),
    "/api/admin/buyers/22222222-2222-4222-8222-222222222222",
    {
      headers: { authorization: "Bearer admin-token" }
    }
  );

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, "NOT_FOUND");
});

test("PATCH /api/admin/buyers/:buyerId/status updates buyer status through admin API", async () => {
  const response = await request(
    createAppWithBuyers(),
    "/api/admin/buyers/11111111-1111-4111-8111-111111111111/status",
    {
      method: "PATCH",
      headers: {
        authorization: "Bearer admin-token",
        "content-type": "application/json"
      },
      body: JSON.stringify({ status: "approved" })
    }
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.data.buyer.status, "approved");
  assert.equal(response.body.data.auditLogId, "audit-1");
});

test("PATCH /api/admin/buyers/:buyerId/status rejects unknown write fields", async () => {
  const response = await request(
    createAppWithBuyers(),
    "/api/admin/buyers/11111111-1111-4111-8111-111111111111/status",
    {
      method: "PATCH",
      headers: {
        authorization: "Bearer admin-token",
        "content-type": "application/json"
      },
      body: JSON.stringify({ status: "approved", role: "admin" })
    }
  );

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("PATCH /api/admin/buyers/:buyerId/status returns NOT_FOUND for unknown buyer", async () => {
  const response = await request(
    createAppWithBuyers(),
    "/api/admin/buyers/22222222-2222-4222-8222-222222222222/status",
    {
      method: "PATCH",
      headers: {
        authorization: "Bearer admin-token",
        "content-type": "application/json"
      },
      body: JSON.stringify({ status: "blocked" })
    }
  );

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, "NOT_FOUND");
});
