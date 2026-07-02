import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { createAdminBannerService } from "../src/services/adminBannerService.js";
import { request } from "./testClient.js";

const bannerId = "11111111-1111-4111-8111-111111111111";

function createAppWithBanners() {
  return createApp({
    env: { nodeEnv: "test", isProduction: false, allowedOrigins: [] },
    services: {
      admin: {
        banners: createAdminBannerService({
          queries: {
            async listBanners(filters) {
              return [
                {
                  id: bannerId,
                  bannerId: "home-main-01",
                  titleEn: "Noblesse snap",
                  desktopImageUrl: "https://cdn.example.test/snap.webp",
                  isVisible: filters.visible ?? true,
                  sortOrder: 10
                }
              ];
            },
            async createBanner(input) {
              if (input.bannerId === "duplicate") return { conflict: "banner" };
              return {
                banner: {
                  id: bannerId,
                  ...input
                },
                auditLogId: "audit-banner-create"
              };
            },
            async updateBanner(id, input) {
              if (id !== bannerId) return null;
              return {
                banner: {
                  id,
                  bannerId: "home-main-01",
                  titleEn: input.titleEn || "Noblesse snap",
                  desktopImageUrl: input.desktopImageUrl || "https://cdn.example.test/snap.webp",
                  isVisible: input.isVisible ?? true,
                  sortOrder: input.sortOrder ?? 10
                },
                auditLogId: "audit-banner-update"
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

test("GET /api/admin/banners returns admin home snaps", async () => {
  const response = await request(createAppWithBanners(), "/api/admin/banners?visible=true", {
    headers: { authorization: "Bearer admin-token" }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.banners[0].bannerId, "home-main-01");
  assert.equal(response.body.data.banners[0].isVisible, true);
});

test("POST /api/admin/banners creates a home snap", async () => {
  const response = await request(createAppWithBanners(), "/api/admin/banners", {
    method: "POST",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      bannerId: "home-main-02",
      titleEn: "New snap",
      desktopImageUrl: "https://cdn.example.test/new.webp",
      linkType: "path",
      linkValue: "/products",
      isVisible: true
    })
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.data.banner.bannerId, "home-main-02");
  assert.equal(response.body.data.auditLogId, "audit-banner-create");
});

test("POST /api/admin/banners rejects duplicate home snap keys", async () => {
  const response = await request(createAppWithBanners(), "/api/admin/banners", {
    method: "POST",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      bannerId: "duplicate",
      titleEn: "Duplicate",
      desktopImageUrl: "https://cdn.example.test/duplicate.webp"
    })
  });

  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, "CONFLICT");
});

test("PATCH /api/admin/banners/:bannerId updates visibility", async () => {
  const response = await request(createAppWithBanners(), `/api/admin/banners/${bannerId}`, {
    method: "PATCH",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": "application/json"
    },
    body: JSON.stringify({ isVisible: false })
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.banner.isVisible, false);
  assert.equal(response.body.data.auditLogId, "audit-banner-update");
});

test("PATCH /api/admin/banners/:bannerId rejects bannerId mutation", async () => {
  const response = await request(createAppWithBanners(), `/api/admin/banners/${bannerId}`, {
    method: "PATCH",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": "application/json"
    },
    body: JSON.stringify({ bannerId: "changed" })
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});
