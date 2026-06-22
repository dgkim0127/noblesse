import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createRequireAdmin } from "../src/auth/requireAdmin.js";
import { resolveAdminPermissions } from "../src/auth/adminPermissions.js";
import { createAdminRoutes } from "../src/routes/adminRoutes.js";
import { errorHandler } from "../src/middleware/errorHandler.js";
import { requestId } from "../src/middleware/requestId.js";
import { request } from "./testClient.js";

test("admin permission matrix grants owner all permissions and operator limited catalog access", () => {
  const owner = resolveAdminPermissions({ adminRole: "owner" });
  const operator = resolveAdminPermissions({ adminRole: "operator" });

  assert.equal(owner.permissions.includes("admins.manage"), true);
  assert.equal(owner.permissions.includes("prices.write"), true);
  assert.equal(operator.permissions.includes("catalog.write"), true);
  assert.equal(operator.permissions.includes("prices.write"), false);
});

test("deny overrides win and expired overrides are ignored", () => {
  const resolved = resolveAdminPermissions({
    adminRole: "manager",
    now: new Date("2026-06-22T00:00:00Z"),
    overrides: [
      { permissionKey: "buyers.review", effect: "deny" },
      { permissionKey: "buyers.review", effect: "allow" },
      { permissionKey: "admins.read", effect: "allow", expiresAt: "2026-06-21T00:00:00Z" }
    ]
  });

  assert.equal(resolved.permissions.includes("buyers.review"), false);
  assert.equal(resolved.permissions.includes("admins.read"), false);
  assert.equal(resolved.deniedPermissions.includes("buyers.review"), true);
});

test("requireAdmin attaches account status, role, and permissions", async () => {
  const middleware = createRequireAdmin({
    verifier: { async verifyIdToken() { return { uid: "admin-uid", email: "admin@example.test" }; } },
    async loadAdminUserByAuthUid() {
      return {
        userId: "admin-1",
        authUid: "admin-uid",
        email: "admin@example.test",
        role: "admin",
        status: "approved",
        accountStatus: "active",
        adminRole: "manager"
      };
    }
  });
  const app = express();
  app.use(requestId);
  app.get("/protected", middleware, (req, res) => {
    res.json({ adminViewer: req.adminViewer });
  });
  app.use(errorHandler);

  const response = await request(app, "/protected", {
    headers: { authorization: "Bearer token" }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.adminViewer.accountStatus, "active");
  assert.equal(response.body.adminViewer.adminRole, "manager");
  assert.equal(response.body.adminViewer.permissions.includes("buyers.review"), true);
});

test("GET /api/admin/me returns the server-verified admin access context", async () => {
  const app = express();
  app.use(requestId);
  app.use(
    "/api/admin",
    createAdminRoutes({
      services: {},
      requireAdmin(req, _res, next) {
        req.adminViewer = {
          userId: "admin-1",
          email: "admin@example.test",
          role: "admin",
          status: "approved",
          accountStatus: "active",
          adminRole: "operator",
          permissions: ["dashboard.read"]
        };
        next();
      }
    })
  );
  app.use(errorHandler);

  const response = await request(app, "/api/admin/me");

  assert.equal(response.status, 200);
  assert.equal(response.body.data.adminRole, "operator");
  assert.deepEqual(response.body.data.permissions, ["dashboard.read"]);
});

test("requirePermission returns 403 and image parser is not called when catalog.write is missing", async () => {
  let parserCalled = false;
  const app = express();
  app.use(requestId);
  app.use(
    "/api/admin",
    createAdminRoutes({
      services: {
        products: {
          uploadProductImages() {
            throw new Error("upload service should not run");
          }
        }
      },
      requireAdmin(req, _res, next) {
        req.adminViewer = { permissions: ["catalog.read"] };
        next();
      },
      imageUploadParser(_req, _res, next) {
        parserCalled = true;
        next();
      }
    })
  );
  app.use(errorHandler);

  const response = await request(app, "/api/admin/products/11111111-1111-4111-8111-111111111111/images", {
    method: "POST",
    headers: { "content-type": "multipart/form-data; boundary=test" },
    body: Buffer.from("--test--\r\n")
  });

  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, "FORBIDDEN");
  assert.equal(parserCalled, false);
});
