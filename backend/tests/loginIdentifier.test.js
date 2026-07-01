import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { createLoginIdentifierQueries } from "../src/db/queries/loginIdentifierQueries.js";
import { createLoginIdentifierService } from "../src/services/loginIdentifierService.js";
import { request } from "./testClient.js";

test("login identifier query resolves one active owner/admin/buyer email local-part", async () => {
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
  assert.match(calls[0].sql, /role in \('owner', 'admin', 'buyer'\)/);
  assert.match(calls[0].sql, /role in \('owner', 'admin'\) and status = 'approved'/);
  assert.match(calls[0].sql, /coalesce\(account_status, 'active'\) = 'active'/);
  assert.match(calls[0].sql, /limit 2/i);
});

test("login identifier query allows approved owner local-part", async () => {
  const queries = createLoginIdentifierQueries({
    async query(sql, params) {
      assert.deepEqual(params, ["owner"]);
      assert.match(sql, /role in \('owner', 'admin', 'buyer'\)/);
      assert.match(sql, /role in \('owner', 'admin'\) and status = 'approved'/);
      return { rows: [{ email: "owner@example.test" }] };
    }
  });

  assert.equal(await queries.findActiveLoginEmailByIdentifier("owner"), "owner@example.test");
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
  assert.match(calls[1].sql, /role in \('owner', 'admin', 'buyer'\)/);
  assert.match(calls[1].sql, /role in \('owner', 'admin'\) and status = 'approved'/);
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

test("malformed JSON maps to safe bad request without changing auth route behavior", async () => {
  const app = createApp({
    env: { nodeEnv: "test", isProduction: false, allowedOrigins: [] },
    services: {
      auth: createLoginIdentifierService({
        queries: {
          async findActiveLoginEmailByIdentifier() {
            return null;
          }
        }
      }),
      catalog: {
        async listProducts() {
          return [];
        }
      }
    }
  });
  const errors = [];
  const originalError = console.error;
  console.error = (...args) => {
    errors.push(args);
  };
  try {
    const malformedResponse = await request(app, "/api/auth/resolve-login-identifier", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: '{"identifier":'
    });

    assert.equal(malformedResponse.status, 400);
    assert.equal(malformedResponse.body.error.code, "INVALID_JSON");
    assert.match(malformedResponse.body.error.requestId, /.+/);
    assert.doesNotMatch(JSON.stringify(malformedResponse.body), /SyntaxError|stack|identifier|password|token|secret/i);
    assert.equal(errors.length, 0);

    const unknownResponse = await request(app, "/api/auth/resolve-login-identifier", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier: "missing" })
    });
    assert.equal(unknownResponse.status, 401);
    assert.equal(unknownResponse.body.error.code, "UNAUTHORIZED");

    const buyerResponse = await request(app, "/api/buyer/me");
    assert.equal(buyerResponse.status, 401);
    assert.equal(buyerResponse.body.error.code, "UNAUTHORIZED");

    const adminResponse = await request(app, "/api/admin/me");
    assert.equal(adminResponse.status, 401);
    assert.equal(adminResponse.body.error.code, "UNAUTHORIZED");

    const healthResponse = await request(app, "/api/health");
    assert.equal(healthResponse.status, 200);

    const catalogResponse = await request(app, "/api/catalog/products");
    assert.equal(catalogResponse.status, 200);
  } finally {
    console.error = originalError;
  }
});
