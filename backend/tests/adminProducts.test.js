import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { createAdminProductService } from "../src/services/adminProductService.js";
import { request } from "./testClient.js";

function createAppWithProducts({ onCreateProduct, onUpdateProduct, onBulkUpdate, onDuplicate } = {}) {
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
            async getProduct(id) {
              if (id !== productId) return null;
              return { id, code: "NB-001", nameKo: "상품", completion: { publishable: false } };
            },
            async createProduct(input) {
              onCreateProduct?.(input);
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
              onUpdateProduct?.(input);
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
            },
            async duplicateProduct(id, code) {
              onDuplicate?.({ id, code });
              if (id !== productId) return null;
              return { product: { id: "22222222-2222-4222-8222-222222222222", code, isVisible: false }, auditLogId: "audit-duplicate-1" };
            },
            async bulkUpdateProducts(input) {
              onBulkUpdate?.(input);
              return { products: input.ids.map((id) => ({ id, isVisible: input.action === "publish" })), auditLogIds: ["audit-bulk-1"] };
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
      isVisible: false
    })
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.data.product.code, "NB-999");
  assert.equal(response.body.data.auditLogId, "audit-create-1");
});

test("GET /api/admin/products/:productId returns editor data", async () => {
  const response = await request(createAppWithProducts(), "/api/admin/products/11111111-1111-4111-8111-111111111111", {
    headers: { authorization: "Bearer admin-token" }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.product.code, "NB-001");
});

test("POST /api/admin/products/:productId/duplicate creates an unpublished copy with a new code", async () => {
  let captured;
  const response = await request(createAppWithProducts({ onDuplicate: (input) => { captured = input; } }), "/api/admin/products/11111111-1111-4111-8111-111111111111/duplicate", {
    method: "POST",
    headers: { authorization: "Bearer admin-token", "content-type": "application/json" },
    body: JSON.stringify({ code: "NB-001-COPY" })
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.data.product.code, "NB-001-COPY");
  assert.equal(response.body.data.product.isVisible, false);
  assert.equal(captured.code, "NB-001-COPY");
});

test("PATCH /api/admin/products/bulk applies a supported action to selected products", async () => {
  let captured;
  const response = await request(createAppWithProducts({ onBulkUpdate: (input) => { captured = input; } }), "/api/admin/products/bulk", {
    method: "PATCH",
    headers: { authorization: "Bearer admin-token", "content-type": "application/json" },
    body: JSON.stringify({ ids: ["11111111-1111-4111-8111-111111111111"], action: "setCategory", categoryKey: "barbell" })
  });

  assert.equal(response.status, 200);
  assert.equal(captured.action, "setCategory");
  assert.equal(captured.categoryKey, "barbell");
});

test("PATCH /api/admin/products/bulk rejects more than 100 products", async () => {
  const ids = Array.from({ length: 101 }, (_, index) => `${String(index).padStart(8, "0")}-1111-4111-8111-111111111111`);
  const response = await request(createAppWithProducts(), "/api/admin/products/bulk", {
    method: "PATCH",
    headers: { authorization: "Bearer admin-token", "content-type": "application/json" },
    body: JSON.stringify({ ids, action: "unpublish" })
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("POST /api/admin/products accepts catalog attributes and detail metadata", async () => {
  let capturedInput;
  const response = await request(createAppWithProducts({ onCreateProduct: (input) => { capturedInput = input; } }), "/api/admin/products", {
    method: "POST",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      code: "NB-ATTR",
      nameEn: "Attribute Product",
      colors: ["Gold", "Silver"],
      sizes: ["6mm"],
      imageSet: {},
      imageAlt: {},
      taxonomy: {
        productGroup: "piercing",
        piercingType: "ball",
        baseMaterial: "surgical",
        allSurgical: true,
        shapes: ["clover"]
      },
      specs: { gauge: "16G", length: "6", unit: "mm" },
      detailContent: { headline: "Clover barbell", care: "Keep dry" },
      homePlacement: { showInPiercing: true, sortPriority: 2 },
      badge: "new drop",
      isVisible: false
    })
  });

  assert.equal(response.status, 201);
  assert.deepEqual(capturedInput.taxonomy.shapes, ["clover"]);
  assert.equal(capturedInput.taxonomy.allSurgical, true);
  assert.equal(capturedInput.specs.gauge, "16G");
  assert.equal(capturedInput.detailContent.care, "Keep dry");
  assert.equal(capturedInput.homePlacement.showInPiercing, true);
  assert.equal(capturedInput.badge, "NEWDROP");
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

test("PATCH /api/admin/products/:productId updates only provided catalog detail fields", async () => {
  let capturedInput;
  const response = await request(
    createAppWithProducts({ onUpdateProduct: (input) => { capturedInput = input; } }),
    "/api/admin/products/11111111-1111-4111-8111-111111111111",
    {
      method: "PATCH",
      headers: {
        authorization: "Bearer admin-token",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        taxonomy: { structures: ["barbell"] },
        specs: { ballSize: "4", unit: "mm" },
        detailContent: { fit: "Lobe and helix" },
        homePlacement: { showInWeeklyPick: true },
        badge: "best"
      })
    }
  );

  assert.equal(response.status, 200);
  assert.deepEqual(capturedInput.taxonomy, { structures: ["barbell"] });
  assert.deepEqual(capturedInput.specs, { ballSize: "4", unit: "mm" });
  assert.deepEqual(capturedInput.detailContent, { fit: "Lobe and helix" });
  assert.deepEqual(capturedInput.homePlacement, { showInWeeklyPick: true });
  assert.equal(capturedInput.badge, "BEST");
  assert.equal("imageSet" in capturedInput, false);
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
