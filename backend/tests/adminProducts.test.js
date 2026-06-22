import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { createAdminProductService } from "../src/services/adminProductService.js";
import { request } from "./testClient.js";

function createAppWithProducts() {
  const productId = "11111111-1111-4111-8111-111111111111";
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
                  id: productId,
                  code: "NB-001",
                  isVisible: filters.visible ?? true
                }
              ];
            },
            async createProduct(input) {
              if (input.code === "NB-DUP") return { conflict: "product_code" };
              if (input.categoryKey === "missing") return { missingCategory: true };
              return {
                product: {
                  id: productId,
                  code: input.code,
                  nameEn: input.nameEn,
                  isVisible: input.isVisible
                },
                auditLogId: "audit-create-1"
              };
            },
            async updateProduct(id, input) {
              if (id !== productId) return null;
              if (input.categoryKey === "missing") return { missingCategory: true };
              return {
                product: {
                  id,
                  code: "NB-001",
                  nameEn: input.nameEn || "Product",
                  isVisible: input.isVisible ?? true
                },
                auditLogId: "audit-update-1"
              };
            },
            async updateProductVisibility(id, isVisible) {
              if (id !== productId) return null;
              return {
                product: {
                  id,
                  code: "NB-001",
                  isVisible
                },
                auditLogId: "audit-1"
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

test("GET /api/admin/products returns products list", async () => {
  const response = await request(createAppWithProducts(), "/api/admin/products", {
    headers: { authorization: "Bearer admin-token" }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.products.length, 1);
});

test("POST /api/admin/products creates product through admin API", async () => {
  const response = await request(createAppWithProducts(), "/api/admin/products", {
    method: "POST",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      code: "NB-999",
      nameEn: "Synthetic Product",
      colors: [],
      sizes: [],
      imageSet: {},
      imageAlt: {},
      isVisible: true
    })
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.data.product.code, "NB-999");
  assert.equal(response.body.data.auditLogId, "audit-create-1");
});

test("POST /api/admin/products rejects duplicate product code", async () => {
  const response = await request(createAppWithProducts(), "/api/admin/products", {
    method: "POST",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      code: "NB-DUP",
      nameEn: "Duplicate Product"
    })
  });

  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, "CONFLICT");
});

test("PATCH /api/admin/products/:productId updates product metadata", async () => {
  const response = await request(
    createAppWithProducts(),
    "/api/admin/products/11111111-1111-4111-8111-111111111111",
    {
      method: "PATCH",
      headers: {
        authorization: "Bearer admin-token",
        "content-type": "application/json"
      },
      body: JSON.stringify({ nameEn: "Updated Product" })
    }
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.data.product.nameEn, "Updated Product");
  assert.equal(response.body.data.auditLogId, "audit-update-1");
});

test("PATCH /api/admin/products/:productId rejects protected price fields", async () => {
  const response = await request(
    createAppWithProducts(),
    "/api/admin/products/11111111-1111-4111-8111-111111111111",
    {
      method: "PATCH",
      headers: {
        authorization: "Bearer admin-token",
        "content-type": "application/json"
      },
      body: JSON.stringify({ wholesalePrice: 10 })
    }
  );

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
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

test("PATCH /api/admin/products/:productId/visibility updates visibility through admin API", async () => {
  const response = await request(
    createAppWithProducts(),
    "/api/admin/products/11111111-1111-4111-8111-111111111111/visibility",
    {
      method: "PATCH",
      headers: {
        authorization: "Bearer admin-token",
        "content-type": "application/json"
      },
      body: JSON.stringify({ isVisible: false })
    }
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.data.product.isVisible, false);
  assert.equal(response.body.data.auditLogId, "audit-1");
});

test("PATCH /api/admin/products/:productId/visibility rejects unknown write fields", async () => {
  const response = await request(
    createAppWithProducts(),
    "/api/admin/products/11111111-1111-4111-8111-111111111111/visibility",
    {
      method: "PATCH",
      headers: {
        authorization: "Bearer admin-token",
        "content-type": "application/json"
      },
      body: JSON.stringify({ isVisible: false, wholesalePrice: 100 })
    }
  );

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("PATCH /api/admin/products/:productId/visibility returns NOT_FOUND for unknown product", async () => {
  const response = await request(
    createAppWithProducts(),
    "/api/admin/products/22222222-2222-4222-8222-222222222222/visibility",
    {
      method: "PATCH",
      headers: {
        authorization: "Bearer admin-token",
        "content-type": "application/json"
      },
      body: JSON.stringify({ isVisible: true })
    }
  );

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, "NOT_FOUND");
});
