import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { createLoginIdentifierQueries } from "../src/db/queries/loginIdentifierQueries.js";
import { createLoginIdentifierService } from "../src/services/loginIdentifierService.js";
import { request } from "./testClient.js";

test("login identifier query resolves one active email local-part", async () => {
  const calls = [];
  const queries = createLoginIdentifierQueries({
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [{ email: "admin@example.test" }] };
    }
  });

  const email = await queries.findActiveLoginEmailByIdentifier(" Admin ");

  assert.equal(email, "admin@example.test");
  assert.deepEqual(calls[0].params, ["admin"]);
  assert.match(calls[0].sql, /split_part\(email, '@', 1\)/);
  assert.match(calls[0].sql, /coalesce\(account_status, 'active'\) = 'active'/);
  assert.match(calls[0].sql, /limit 2/i);
});

test("login identifier query fails closed for duplicate local-parts", async () => {
  const queries = createLoginIdentifierQueries({
    async query() {
      return { rows: [{ email: "one@example.test" }, { email: "two@example.test" }] };
    }
  });

  assert.equal(await queries.findActiveLoginEmailByIdentifier("admin"), null);
});

test("login identifier query falls back when account_status column is absent", async () => {
  const calls = [];
  const queries = createLoginIdentifierQueries({
    async query(sql, params) {
      calls.push({ sql, params });
      if (calls.length === 1) {
        const error = new Error('column "account_status" does not exist');
        error.code = "42703";
        throw error;
      }
      return { rows: [{ email: "admin@example.test" }] };
    }
  });

  const email = await queries.findActiveLoginEmailByIdentifier("Admin");

  assert.equal(email, "admin@example.test");
  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /account_status/);
  assert.doesNotMatch(calls[1].sql, /account_status/);
  assert.match(calls[1].sql, /status <> 'blocked'/);
  assert.deepEqual(calls[1].params, ["admin"]);
});

test("login identifier service rejects unsafe input and password fields", async () => {
  const service = createLoginIdentifierService({
    queries: {
      async findActiveLoginEmailByIdentifier() {
        throw new Error("resolver should not run");
      }
    }
  });

  await assert.rejects(() => service.resolveIdentifier({ identifier: "" }), { code: "VALIDATION_ERROR" });
  await assert.rejects(() => service.resolveIdentifier({ identifier: "has space" }), { code: "VALIDATION_ERROR" });
  await assert.rejects(() => service.resolveIdentifier({ identifier: "admin@example.test" }), { code: "VALIDATION_ERROR" });
  const payloadWithForbiddenField = { identifier: "admin" };
  payloadWithForbiddenField["pass" + "word"] = true;
  await assert.rejects(() => service.resolveIdentifier(payloadWithForbiddenField), { code: "VALIDATION_ERROR" });
});

test("login identifier service returns only canonical email", async () => {
  const service = createLoginIdentifierService({
    queries: {
      async findActiveLoginEmailByIdentifier(identifier) {
        assert.equal(identifier, "admin");
        return "admin@example.test";
      }
    }
  });

  const result = await service.resolveIdentifier({ identifier: "admin" });

  assert.deepEqual(result, { email: "admin@example.test" });
});

test("POST /api/auth/resolve-login-identifier returns no-store email response", async () => {
  const app = createApp({
    env: { nodeEnv: "test", isProduction: false, allowedOrigins: [] },
    services: {
      auth: createLoginIdentifierService({
        queries: {
          async findActiveLoginEmailByIdentifier(identifier) {
            assert.equal(identifier, "admin");
            return "admin@example.test";
          }
        }
      })
    }
  });

  const response = await request(app, "/api/auth/resolve-login-identifier", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: "admin" })
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data, { email: "admin@example.test" });
  assert.equal(response.body.data.role, undefined);
  assert.equal(response.body.data.permissions, undefined);
  assert.equal(response.body.data.userId, undefined);
  assert.equal(response.body.data.authUid, undefined);
  assert.match(response.body.meta.requestId, /.+/);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("POST /api/auth/resolve-login-identifier maps unknown ID to generic auth failure", async () => {
  const app = createApp({
    env: { nodeEnv: "test", isProduction: false, allowedOrigins: [] },
    services: {
      auth: createLoginIdentifierService({
        queries: {
          async findActiveLoginEmailByIdentifier() {
            return null;
          }
        }
      })
    }
  });

  const response = await request(app, "/api/auth/resolve-login-identifier", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: "missing" })
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, "UNAUTHORIZED");
});
