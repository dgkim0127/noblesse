import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { createAdminCategoryService } from "../src/services/adminCategoryService.js";
import { request } from "./testClient.js";

function createAppWithCategories() {
  const categoryId = "11111111-1111-4111-8111-111111111111";
  return createApp({
    env: { nodeEnv: "test", isProduction: false, allowedOrigins: [] },
    services: {
      admin: {
        dashboard: {},
        inquiries: {},
        buyers: {},
        products: {},
        categories: createAdminCategoryService({
          queries: {
            async listCategories(filters) {
              return [
                {
                  id: categoryId,
                  categoryId: "synthetic",
                  nameEn: "Synthetic Category",
                  slug: "synthetic",
                  isVisible: filters.visible ?? true
                }
              ];
            },
            async createCategory(input) {
              if (input.categoryId === "duplicate") return { conflict: "category" };
              return {
                category: {
                  id: categoryId,
                  categoryId: input.categoryId,
                  nameEn: input.nameEn,
                  slug: input.slug,
                  isVisible: input.isVisible
                },
                auditLogId: "audit-create-1"
              };
            },
            async updateCategory(id, input) {
              if (id !== categoryId) return null;
              return {
                category: {
                  id,
                  categoryId: "synthetic",
                  nameEn: input.nameEn || "Synthetic Category",
                  slug: input.slug || "synthetic",
                  isVisible: input.isVisible ?? true
                },
                auditLogId: "audit-update-1"
              };
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

test("GET /api/admin/categories returns categories list", async () => {
  const response = await request(createAppWithCategories(), "/api/admin/categories?visible=true", {
    headers: { authorization: "Bearer admin-token" }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.categories[0].categoryId, "synthetic");
  assert.equal(response.body.data.categories[0].isVisible, true);
});

test("POST /api/admin/categories creates category", async () => {
  const response = await request(createAppWithCategories(), "/api/admin/categories", {
    method: "POST",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      categoryId: "synthetic",
      nameEn: "Synthetic Category",
      slug: "synthetic",
      isVisible: true
    })
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.data.category.categoryId, "synthetic");
  assert.equal(response.body.data.auditLogId, "audit-create-1");
});

test("POST /api/admin/categories rejects duplicate category", async () => {
  const response = await request(createAppWithCategories(), "/api/admin/categories", {
    method: "POST",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      categoryId: "duplicate",
      nameEn: "Duplicate Category",
      slug: "duplicate"
    })
  });

  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, "CONFLICT");
});

test("PATCH /api/admin/categories/:categoryId updates category visibility", async () => {
  const response = await request(
    createAppWithCategories(),
    "/api/admin/categories/11111111-1111-4111-8111-111111111111",
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
  assert.equal(response.body.data.category.isVisible, false);
  assert.equal(response.body.data.auditLogId, "audit-update-1");
});

test("PATCH /api/admin/categories/:categoryId rejects categoryId mutation", async () => {
  const response = await request(
    createAppWithCategories(),
    "/api/admin/categories/11111111-1111-4111-8111-111111111111",
    {
      method: "PATCH",
      headers: {
        authorization: "Bearer admin-token",
        "content-type": "application/json"
      },
      body: JSON.stringify({ categoryId: "changed" })
    }
  );

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});
