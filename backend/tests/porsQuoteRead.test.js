import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { request } from "./testClient.js";

const readToken = "test-pors-read-token";

async function requestStatus(app, path, options = {}) {
  const server = app.listen(0);
  const { port } = server.address();
  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, options);
    return response.status;
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

function createPorsReadApp() {
  const calls = [];
  const app = createApp({
    env: {
      nodeEnv: "test",
      isProduction: false,
      allowedOrigins: [],
      porsQuoteReadToken: readToken
    },
    services: {
      admin: {
        pos: {
          async listQuotes(filters, viewer) {
            calls.push({ operation: "list", filters, viewer });
            return { quotes: [{ id: "quote-1" }], meta: { limit: 20 } };
          },
          async getQuoteById(quoteId, viewer) {
            calls.push({ operation: "detail", quoteId, viewer });
            return { quote: { id: quoteId }, items: [] };
          }
        }
      }
    }
  });
  return { app, calls };
}

test("PORS quote reads reject missing or invalid device tokens", async () => {
  const { app } = createPorsReadApp();
  const missing = await request(app, "/api/pors/quotes");
  const invalid = await request(app, "/api/pors/quotes", {
    headers: { "x-pors-quote-read-token": "wrong-token" }
  });

  assert.equal(missing.status, 401);
  assert.equal(invalid.status, 401);
  assert.equal(missing.body.error.code, "UNAUTHORIZED");
});

test("PORS quote reads accept the scoped device token", async () => {
  const { app, calls } = createPorsReadApp();
  const headers = { "x-pors-quote-read-token": readToken };
  const list = await request(app, "/api/pors/quotes?limit=20", { headers });
  const detail = await request(app, "/api/pors/quotes/quote-1", { headers });

  assert.equal(list.status, 200);
  assert.deepEqual(list.body.quotes, [{ id: "quote-1" }]);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.quote.id, "quote-1");
  assert.equal(calls[0].viewer.authUid, "pors-readonly-device");
  assert.deepEqual(calls[0].viewer.permissions, ["quotes.read"]);
});

test("PORS read route exposes no quote write endpoint", async () => {
  const { app } = createPorsReadApp();
  const status = await requestStatus(app, "/api/pors/quotes/quote-1/picking", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      "x-pors-quote-read-token": readToken
    },
    body: JSON.stringify({ expectedVersion: 1, idempotencyKey: "blocked-write" })
  });

  assert.equal(status, 404);
});
