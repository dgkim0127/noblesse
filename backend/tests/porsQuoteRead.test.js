import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { request } from "./testClient.js";

const readToken = "test-pors-read-token";
const writeToken = "test-pors-write-token";

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
      porsQuoteReadToken: readToken,
      porsQuoteWriteToken: writeToken
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
          },
          async savePicking(quoteId, payload, viewer) {
            calls.push({ operation: "picking", quoteId, payload, viewer });
            return { quote: { id: quoteId }, state: { version: 2 } };
          },
          async previewPrice(quoteId, payload, viewer) {
            calls.push({ operation: "price-preview", quoteId, payload, viewer });
            return { pricing: { totalAmount: 1100 } };
          },
          async finalizeQuote(quoteId, payload, viewer) {
            calls.push({ operation: "finalize", quoteId, payload, viewer });
            return { quote: { id: quoteId }, state: { version: 3 } };
          },
          async publishQuote(quoteId, payload, viewer) {
            calls.push({ operation: "publish", quoteId, payload, viewer });
            return { quote: { id: quoteId }, state: { version: 4 } };
          },
          async linkReceipt(quoteId, payload, viewer) {
            calls.push({ operation: "receipt-link", quoteId, payload, viewer });
            return { quote: { id: quoteId }, receiptLink: payload.receiptLink };
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
  assert.equal(calls[0].viewer.userId, null);
  assert.equal(calls[0].viewer.authUid, "pors-readonly-device");
  assert.deepEqual(calls[0].viewer.permissions, ["quotes.read"]);
});

test("PORS quote writers can read without a second device credential", async () => {
  const { app, calls } = createPorsReadApp();
  const response = await request(app, "/api/pors/quotes", {
    headers: { "x-pors-quote-read-token": writeToken }
  });

  assert.equal(response.status, 200);
  assert.equal(calls[0].viewer.userId, null);
  assert.equal(calls[0].viewer.authUid, "pors-managed-device");
  assert.deepEqual(calls[0].viewer.permissions, ["quotes.read"]);
});

test("PORS quote writes reject missing and read-only device tokens", async () => {
  const { app } = createPorsReadApp();
  const path = "/api/pors/quotes/quote-1/picking";
  const missing = await requestStatus(app, path, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ expectedVersion: 1, idempotencyKey: "missing-write" })
  });
  const readOnly = await requestStatus(app, path, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      "x-pors-quote-read-token": readToken
    },
    body: JSON.stringify({ expectedVersion: 1, idempotencyKey: "read-only-write" })
  });

  assert.equal(missing, 401);
  assert.equal(readOnly, 401);
});

test("PORS quote write routes use only the scoped device writer", async () => {
  const { app, calls } = createPorsReadApp();
  const headers = {
    "content-type": "application/json",
    "x-pors-quote-write-token": writeToken
  };
  const operations = [
    { path: "picking", method: "PUT", expectedStatus: 200 },
    { path: "price-preview", method: "POST", expectedStatus: 200 },
    { path: "finalize", method: "POST", expectedStatus: 201 },
    { path: "publish", method: "POST", expectedStatus: 201 },
    { path: "receipt-link", method: "POST", expectedStatus: 200 }
  ];

  for (const [index, operation] of operations.entries()) {
    const payload = {
      expectedVersion: index + 1,
      idempotencyKey: `device-write-${operation.path}`
    };
    if (operation.path === "receipt-link") {
      payload.receiptLink = { receiptId: "receipt-1" };
    }
    const response = await request(app, `/api/pors/quotes/quote-1/${operation.path}`, {
      method: operation.method,
      headers,
      body: JSON.stringify(payload)
    });
    assert.equal(response.status, operation.expectedStatus);
  }

  assert.equal(calls.length, operations.length);
  assert.deepEqual(
    calls.map((call) => call.operation),
    ["picking", "price-preview", "finalize", "publish", "receipt-link"]
  );
  for (const call of calls) {
    assert.equal(call.viewer.userId, null);
    assert.equal(call.viewer.authUid, "pors-managed-device");
    assert.deepEqual(call.viewer.permissions, ["quotes.read", "quotes.write"]);
    assert.match(call.payload.idempotencyKey, /^device-write-/);
    assert.ok(Number.isInteger(call.payload.expectedVersion));
  }
});
