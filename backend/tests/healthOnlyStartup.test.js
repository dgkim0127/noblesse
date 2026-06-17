import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { assertProductionConfig, getEnv } from "../src/config/env.js";
import { createPool } from "../src/db/pool.js";
import { request } from "./testClient.js";

test("getEnv parses ALLOW_HEALTH_ONLY_STARTUP=true", () => {
  const env = getEnv({
    NODE_ENV: "production",
    PORT: "18081",
    ALLOW_HEALTH_ONLY_STARTUP: "true"
  });

  assert.equal(env.isProduction, true);
  assert.equal(env.allowHealthOnlyStartup, true);
  assert.equal(env.port, 18081);
});

test("production strict mode without server secrets fails", () => {
  const env = getEnv({
    NODE_ENV: "production"
  });

  assert.throws(
    () => assertProductionConfig(env),
    /Missing required server configuration/
  );
});

test("production health-only mode without DB/Auth secrets passes config assertion", () => {
  const env = getEnv({
    NODE_ENV: "production",
    ALLOW_HEALTH_ONLY_STARTUP: "true"
  });

  assert.doesNotThrow(() => assertProductionConfig(env));
});

test("createPool returns null for production health-only startup without DATABASE_URL", () => {
  const env = getEnv({
    NODE_ENV: "production",
    ALLOW_HEALTH_ONLY_STARTUP: "true"
  });

  assert.equal(createPool(env), null);
});

test("production health-only app serves /api/health without DB/Auth secrets", async () => {
  const env = getEnv({
    NODE_ENV: "production",
    ALLOW_HEALTH_ONLY_STARTUP: "true"
  });
  assertProductionConfig(env);
  const app = createApp({ env });

  const response = await request(app, "/api/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.service, "noblesse-backend");
  assert.equal(response.body.version, "phase1");
});

test("production health-only admin route fails closed without token", async () => {
  const env = getEnv({
    NODE_ENV: "production",
    ALLOW_HEALTH_ONLY_STARTUP: "true"
  });
  assertProductionConfig(env);
  const app = createApp({ env });

  const response = await request(app, "/api/admin/dashboard");

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, "UNAUTHORIZED");
  assert.match(response.headers.get("x-request-id"), /.+/);
  assert.equal(response.body.error.requestId, response.headers.get("x-request-id"));
  assert.doesNotMatch(JSON.stringify(response.body), /DATABASE_URL|FIREBASE_PRIVATE_KEY|SQL/i);
});
