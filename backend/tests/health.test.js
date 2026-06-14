import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { request } from "./testClient.js";

test("GET /api/health returns backend status", async () => {
  const app = createApp({
    env: { nodeEnv: "test", isProduction: false, allowedOrigins: [] }
  });

  const response = await request(app, "/api/health");

  assert.equal(response.status, 200);
  assert.match(response.headers.get("x-request-id"), /.+/);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.service, "noblesse-backend");
  assert.equal(response.body.version, "phase1");
});
