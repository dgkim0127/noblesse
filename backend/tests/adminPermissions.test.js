import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequireAdmin } from "../src/auth/requireAdmin.js";
import { resolveAdminPermissions } from "../src/auth/adminPermissions.js";
import { createAdminAccessQueries } from "../src/db/queries/adminAccessQueries.js";
import { createAdminRoutes } from "../src/routes/adminRoutes.js";
import { createAdminAccessService } from "../src/services/adminAccessService.js";
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

test("requireAdmin does not promote missing or invalid adminRole to owner", async () => {
  async function loadAdminUserByAuthUid(_uid) {
    return {
      userId: "admin-1",
      authUid: "admin-uid",
      email: "admin@example.test",
      role: "admin",
      status: "approved",
      accountStatus: "active"
    };
  }
  const middleware = createRequireAdmin({
    verifier: { async verifyIdToken() { return { uid: "admin-uid", email: "admin@example.test" }; } },
    loadAdminUserByAuthUid
  });
  const app = express();
  app.use(requestId);
  app.get("/protected", middleware, (req, res) => res.json({ adminViewer: req.adminViewer }));
  app.use(errorHandler);

  const response = await request(app, "/protected", {
    headers: { authorization: "Bearer token" }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.adminViewer.adminRole, "operator");
  assert.equal(response.body.adminViewer.permissions.includes("settings.manage"), false);
  assert.equal(response.body.adminViewer.permissions.includes("admins.manage"), false);
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

test("admin access query falls back when account_status column is absent", async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (calls.length === 1) {
        const error = new Error('column "account_status" does not exist');
        error.code = "42703";
        throw error;
      }
      if (/from public\.users u/i.test(sql)) {
        return {
          rowCount: 1,
          rows: [{
            user_id: "admin-1",
            email: "admin@example.test",
            role: "admin",
            status: "approved",
            account_status: "active",
            admin_role: "operator"
          }]
        };
      }
      return { rowCount: 0, rows: [] };
    },
    release() {}
  };
  const queries = createAdminAccessQueries({
    async connect() {
      return client;
    }
  });

  const admin = await queries.getAdminUserByAuthUid("admin-uid");

  assert.equal(admin.accountStatus, "active");
  assert.equal(admin.adminRole, "operator");
  assert.equal(calls.length, 3);
  assert.match(calls[0].sql, /u\.account_status/);
  assert.doesNotMatch(calls[1].sql, /u\.account_status/);
  assert.match(calls[1].sql, /case when u\.status = 'blocked'/);
});

test("admin list query falls back when account_status column is absent", async () => {
  const calls = [];
  const queries = createAdminAccessQueries({
    async query(sql, params) {
      calls.push({ sql, params });
      if (calls.length === 1) {
        const error = new Error('column "account_status" does not exist');
        error.code = "42703";
        throw error;
      }
      if (/from public\.users u/i.test(sql)) {
        return {
          rowCount: 1,
          rows: [{
            user_id: "admin-1",
            email: "admin@example.test",
            role: "admin",
            status: "approved",
            account_status: "active",
            admin_role: "operator"
          }]
        };
      }
      return { rowCount: 0, rows: [] };
    }
  });

  const admins = await queries.listAdmins();

  assert.equal(admins.length, 1);
  assert.equal(admins[0].accountStatus, "active");
  assert.equal(calls.length, 3);
  assert.match(calls[0].sql, /u\.account_status/);
  assert.doesNotMatch(calls[1].sql, /u\.account_status/);
  assert.match(calls[1].sql, /case when u\.status = 'blocked'/);
});

test("admin access query falls back when admin profile table is absent", async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (calls.length === 1) {
        const error = new Error('relation "public.admin_profiles" does not exist');
        error.code = "42P01";
        throw error;
      }
      if (/from public\.users u/i.test(sql)) {
        return {
          rowCount: 1,
          rows: [{
            user_id: "admin-1",
            email: "admin@example.test",
            role: "admin",
            status: "approved",
            account_status: "active",
            admin_role: "operator"
          }]
        };
      }
      return { rowCount: 0, rows: [] };
    },
    release() {}
  };
  const queries = createAdminAccessQueries({
    async connect() {
      return client;
    }
  });

  const admin = await queries.getAdminUserByAuthUid("admin-uid");

  assert.equal(admin.adminRole, "operator");
  assert.equal(admin.accountStatus, "active");
  assert.match(calls[0].sql, /admin_profiles/);
  assert.ok(calls.some((call) => !/admin_profiles/.test(call.sql)));
});

test("admin access query falls back when permission overrides table is absent", async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (/from public\.users u/i.test(sql)) {
        return {
          rowCount: 1,
          rows: [{
            user_id: "admin-1",
            email: "admin@example.test",
            role: "admin",
            status: "approved",
            account_status: "active",
            admin_role: "operator"
          }]
        };
      }
      if (/from public\.admin_permission_overrides/i.test(sql)) {
        const error = new Error('relation "public.admin_permission_overrides" does not exist');
        error.code = "42P01";
        throw error;
      }
      return { rowCount: 0, rows: [] };
    },
    release() {}
  };
  const queries = createAdminAccessQueries({
    async connect() {
      return client;
    }
  });

  const admin = await queries.getAdminUserByAuthUid("admin-uid");

  assert.equal(admin.adminRole, "operator");
  assert.deepEqual(admin.permissionOverrides, []);
  assert.ok(admin.permissions.includes("dashboard.read"));
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

test("settings.manage is reserved for owner role", () => {
  const owner = resolveAdminPermissions({ adminRole: "owner" });
  const manager = resolveAdminPermissions({
    adminRole: "manager",
    overrides: [
      { permissionKey: "admins.manage", effect: "allow" },
      { permissionKey: "settings.manage", effect: "allow" }
    ]
  });
  const operator = resolveAdminPermissions({ adminRole: "operator" });

  assert.equal(owner.permissions.includes("settings.manage"), true);
  assert.equal(owner.permissions.includes("admins.manage"), true);
  assert.equal(manager.permissions.includes("settings.manage"), false);
  assert.equal(manager.permissions.includes("admins.manage"), false);
  assert.equal(operator.permissions.includes("settings.manage"), false);
});

test("permission override validation requires reason, future expiresAt, and unique keys", async () => {
  const service = createAdminAccessService({
    queries: {
      async replacePermissionOverrides() {
        throw new Error("query should not be called for invalid input");
      }
    }
  });
  const userId = "11111111-1111-4111-8111-111111111111";
  const adminViewer = { userId: "admin-1", adminRole: "owner", permissions: ["admins.manage"] };

  await assert.rejects(
    () => service.replacePermissionOverrides(userId, {
      overrides: [{ permissionKey: "buyers.read", effect: "allow" }]
    }, adminViewer),
    /reason is required/
  );
  await assert.rejects(
    () => service.replacePermissionOverrides(userId, {
      overrides: [{ permissionKey: "buyers.read", effect: "allow", reason: "temporary", expiresAt: "2020-01-01T00:00:00Z" }]
    }, adminViewer),
    /future/
  );
  await assert.rejects(
    () => service.replacePermissionOverrides(userId, {
      overrides: [
        { permissionKey: "buyers.read", effect: "allow", reason: "temporary" },
        { permissionKey: "buyers.read", effect: "deny", reason: "temporary" }
      ]
    }, adminViewer),
    /Duplicate permissionKey/
  );
  await assert.rejects(
    () => service.replacePermissionOverrides(userId, {
      overrides: [{ permissionKey: "admins.manage", effect: "allow", reason: "temporary" }]
    }, { ...adminViewer, adminRole: "owner", permissions: ["admins.manage"] }),
    /Governance permissions cannot be delegated/
  );
});

test("single permission override upsert validates input and preserves sibling overrides through query API", async () => {
  let captured = null;
  const service = createAdminAccessService({
    queries: {
      async upsertPermissionOverride(userId, override, adminViewer) {
        captured = { userId, override, adminViewer };
        return { userId, override };
      }
    }
  });
  const userId = "11111111-1111-4111-8111-111111111111";
  const adminViewer = { userId: "admin-1", adminRole: "owner", permissions: ["admins.manage"] };

  await assert.rejects(
    () => service.upsertPermissionOverride(userId, "buyers.read", { effect: "allow" }, adminViewer),
    /reason is required/
  );
  await assert.rejects(
    () => service.upsertPermissionOverride(userId, "buyers.read", { effect: "allow", reason: "temporary", expiresAt: "2020-01-01T00:00:00Z" }, adminViewer),
    /future/
  );

  const result = await service.upsertPermissionOverride(userId, "buyers.review", {
    effect: "deny",
    reason: "temporary review block"
  }, adminViewer);

  assert.equal(result.override.permissionKey, "buyers.review");
  assert.equal(captured.override.reason, "temporary review block");
});

test("governance writes require owner role even when admins.manage is present", async () => {
  const service = createAdminAccessService({
    queries: {
      async updateAdminRole() {
        throw new Error("query should not be called");
      },
      async upsertPermissionOverride() {
        throw new Error("query should not be called");
      }
    }
  });
  const userId = "11111111-1111-4111-8111-111111111111";
  const managerWithForgedPermission = {
    userId: "admin-1",
    adminRole: "manager",
    permissions: ["admins.manage"]
  };

  await assert.rejects(
    () => service.updateAdminRole(userId, { adminRole: "owner" }, managerWithForgedPermission),
    /Owner admin access required/
  );
  await assert.rejects(
    () => service.upsertPermissionOverride(
      userId,
      "admins.read",
      { effect: "allow", reason: "temporary" },
      managerWithForgedPermission
    ),
    /Owner admin access required/
  );
});

test("admin access query SQL uses existing audit target columns", () => {
  const source = readFileSync(join(process.cwd(), "src", "db", "queries", "adminAccessQueries.js"), "utf8");

  assert.match(source, /target_table/);
  assert.match(source, /target_id/);
  assert.doesNotMatch(source, /entity_type/);
  assert.doesNotMatch(source, /entity_id/);
  assert.match(source, /admin\.permission_override\.upsert/);
  assert.match(source, /on conflict \(user_id, permission_key\)/);
  assert.match(source, /changedFields/);
});
