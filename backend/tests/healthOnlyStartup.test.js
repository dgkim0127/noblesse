import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { assertProductionConfig, getEnv } from "../src/config/env.js";
import { buildPoolConfig, createPool } from "../src/db/pool.js";
import { request } from "./testClient.js";

const dummyDatabaseUrl = "postgres://user:pass@placeholder.example:5432/noblesse_staging";
const dummyConnectionName = "test-project:asia-northeast3:test-instance";

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

test("getEnv defaults DB_CONNECTION_MODE to tcp", () => {
  const env = getEnv({});

  assert.equal(env.dbConnectionMode, "tcp");
});

test("getEnv parses DB_CONNECTION_MODE=cloudsql-socket", () => {
  const env = getEnv({
    DB_CONNECTION_MODE: "cloudsql-socket"
  });

  assert.equal(env.dbConnectionMode, "cloudsql-socket");
});

test("invalid DB_CONNECTION_MODE throws safe config error", () => {
  assert.throws(
    () => getEnv({ DB_CONNECTION_MODE: "invalid-mode" }),
    (error) => {
      assert.match(error.message, /Invalid DB_CONNECTION_MODE/);
      assert.doesNotMatch(error.message, /postgres:\/\/|pass|private_key/i);
      return true;
    }
  );
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

test("production strict socket mode without CLOUD_SQL_INSTANCE_CONNECTION_NAME fails", () => {
  const env = getEnv({
    NODE_ENV: "production",
    DB_CONNECTION_MODE: "cloudsql-socket",
    DATABASE_URL: dummyDatabaseUrl,
    FIREBASE_CLIENT_EMAIL: "firebase-admin@example.test",
    FIREBASE_PRIVATE_KEY: "dummy-private-key",
    FIREBASE_PROJECT_ID: "dummy-project"
  });

  assert.throws(
    () => assertProductionConfig(env),
    (error) => {
      assert.match(error.message, /CLOUD_SQL_INSTANCE_CONNECTION_NAME/);
      assert.doesNotMatch(error.message, /postgres:\/\/|pass|dummy-private-key|private_key/i);
      return true;
    }
  );
});

test("production health-only mode without DB/Auth secrets passes config assertion", () => {
  const env = getEnv({
    NODE_ENV: "production",
    ALLOW_HEALTH_ONLY_STARTUP: "true"
  });

  assert.doesNotThrow(() => assertProductionConfig(env));
});

test("production health-only socket mode without CLOUD_SQL_INSTANCE_CONNECTION_NAME passes config assertion", () => {
  const env = getEnv({
    NODE_ENV: "production",
    ALLOW_HEALTH_ONLY_STARTUP: "true",
    DB_CONNECTION_MODE: "cloudsql-socket"
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

test("buildPoolConfig tcp mode keeps connectionString and production ssl behavior", () => {
  const env = getEnv({
    NODE_ENV: "production",
    DATABASE_URL: dummyDatabaseUrl,
    DB_POOL_MAX: "7",
    DB_CONNECTION_TIMEOUT_MS: "6000",
    DB_IDLE_TIMEOUT_MS: "40000"
  });

  const config = buildPoolConfig(env);

  assert.equal(config.connectionString, dummyDatabaseUrl);
  assert.deepEqual(config.ssl, { rejectUnauthorized: false });
  assert.equal(config.max, 7);
  assert.equal(config.connectionTimeoutMillis, 6000);
  assert.equal(config.idleTimeoutMillis, 40000);
});

test("buildPoolConfig cloudsql-socket mode builds socket config without ssl", () => {
  const env = getEnv({
    DATABASE_URL: dummyDatabaseUrl,
    DB_CONNECTION_MODE: "cloudsql-socket",
    CLOUD_SQL_INSTANCE_CONNECTION_NAME: dummyConnectionName
  });

  const config = buildPoolConfig(env);

  assert.equal(config.host, `/cloudsql/${dummyConnectionName}`);
  assert.equal(config.database, "noblesse_staging");
  assert.equal(config.user, "user");
  assert.equal(config.password, "pass");
  assert.equal(config.port, 5432);
  assert.equal(config.ssl, undefined);
});

test("invalid pool numeric options throw safe config error", () => {
  assert.throws(
    () => getEnv({ DB_POOL_MAX: "0" }),
    (error) => {
      assert.match(error.message, /Invalid DB_POOL_MAX/);
      assert.doesNotMatch(error.message, /postgres:\/\/|password|private_key/i);
      return true;
    }
  );
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
