import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { createAdminProductService } from "../src/services/adminProductService.js";
import { request } from "./testClient.js";

function createAppWithProducts() {
  return createApp({
    env: { nodeEnv: "test", isProduction: false, allowedOrigins: [] },
    services: {
      admin: {
        dashboard: {},
        inquiries: {},
        buyers: {},
        products: createAdminProductService({
          queries: {
            async listProducts(filters) {
              return [
                {
                  id: "product-1",
                  code: "NB-001",
                  isVisible: filters.visible ?? true
                }
              ];
            }
          }
        })
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

test("GET /api/admin/products returns products list", async () => {
  const response = await request(createAppWithProducts(), "/api/admin/products", {
    headers: { authorization: "Bearer admin-token" }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.products.length, 1);
});

test("GET /api/admin/products parses visible boolean filter", async () => {
  for (const visible of ["true", "false"]) {
    const response = await request(createAppWithProducts(), `/api/admin/products?visible=${visible}`, {
      headers: { authorization: "Bearer admin-token" }
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.products[0].isVisible, visible === "true");
  }
});

test("GET /api/admin/products rejects invalid visible filter", async () => {
  const response = await request(createAppWithProducts(), "/api/admin/products?visible=maybe", {
    headers: { authorization: "Bearer admin-token" }
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});
