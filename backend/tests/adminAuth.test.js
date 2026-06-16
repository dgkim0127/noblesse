import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { request } from "./testClient.js";

function createAdminApp({ userByToken = {} } = {}) {
  const adminServices = {
    dashboard: {
      async getDashboard() {
        return {
          inquiries: {},
          buyers: {},
          products: {}
        };
      }
    },
    inquiries: {},
    buyers: {},
    products: {}
  };

  return createApp({
    env: { nodeEnv: "test", isProduction: false, allowedOrigins: [] },
    services: { admin: adminServices },
    auth: {
      adminVerifier: {
        async verifyIdToken(token) {
          if (token === "invalid-token") {
            throw new Error("invalid token");
          }
          return { uid: token, email: `${token}@example.test` };
        }
      },
      async loadAdminUserByAuthUid(authUid) {
        return userByToken[authUid] || null;
      }
    }
  });
}

test("GET /api/admin/dashboard returns UNAUTHORIZED without token", async () => {
  const app = createAdminApp();
  const response = await request(app, "/api/admin/dashboard");

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, "UNAUTHORIZED");
});

test("GET /api/admin/dashboard returns UNAUTHORIZED for invalid token", async () => {
  const app = createAdminApp();
  const response = await request(app, "/api/admin/dashboard", {
    headers: { authorization: "Bearer invalid-token" }
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, "UNAUTHORIZED");
});

test("GET /api/admin/dashboard returns FORBIDDEN for non-admin user", async () => {
  const app = createAdminApp({
    userByToken: {
      "buyer-token": {
        userId: "user-1",
        authUid: "buyer-token",
        role: "buyer",
        status: "approved"
      }
    }
  });
  const response = await request(app, "/api/admin/dashboard", {
    headers: { authorization: "Bearer buyer-token" }
  });

  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, "FORBIDDEN");
});

test("GET /api/admin/dashboard returns FORBIDDEN for pending admin", async () => {
  const app = createAdminApp({
    userByToken: {
      "pending-token": {
        userId: "admin-1",
        authUid: "pending-token",
        role: "admin",
        status: "pending"
      }
    }
  });
  const response = await request(app, "/api/admin/dashboard", {
    headers: { authorization: "Bearer pending-token" }
  });

  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, "FORBIDDEN");
});

test("GET /api/admin/dashboard allows approved admin", async () => {
  const app = createAdminApp({
    userByToken: {
      "admin-token": {
        userId: "admin-1",
        authUid: "admin-token",
        role: "admin",
        status: "approved"
      }
    }
  });
  const response = await request(app, "/api/admin/dashboard", {
    headers: { authorization: "Bearer admin-token" }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.meta.requestId, response.headers.get("x-request-id"));
});
