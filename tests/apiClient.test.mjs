import assert from "node:assert/strict";
import test from "node:test";
import { createBuyerApi } from "../src/api/buyerApi.js";
import { createApiClient } from "../src/api/client.js";
import { createCatalogApi } from "../src/api/catalogApi.js";
import { ApiClientError } from "../src/api/errors.js";

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: {
      "content-type": "application/json",
      ...(init.headers || {})
    }
  });
}

test("apiFetch success parses JSON and request id", async () => {
  const api = createApiClient({
    baseUrl: "http://localhost:8080",
    fetchImpl: async (url) => {
      assert.equal(url, "http://localhost:8080/health");
      return jsonResponse({ ok: true }, { headers: { "x-request-id": "req-1" } });
    }
  });

  const response = await api.apiFetch("/health");

  assert.deepEqual(response.data, { ok: true });
  assert.equal(response.status, 200);
  assert.equal(response.requestId, "req-1");
});

test("apiFetch attaches bearer token when token is provided", async () => {
  const api = createApiClient({
    fetchImpl: async (_url, options) => {
      assert.equal(options.headers.get("authorization"), "Bearer test-token");
      return jsonResponse({ profile: { status: "approved" } });
    }
  });

  await api.apiFetch("/buyer/me", { token: "test-token" });
});

test("apiFetch handles backend error shape and requestId", async () => {
  const api = createApiClient({
    fetchImpl: async () =>
      jsonResponse(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
            requestId: "body-request-id"
          }
        },
        { status: 401, headers: { "x-request-id": "header-request-id" } }
      )
  });

  await assert.rejects(
    () => api.apiFetch("/buyer/me"),
    (error) => {
      assert.equal(error instanceof ApiClientError, true);
      assert.equal(error.code, "UNAUTHORIZED");
      assert.equal(error.message, "Authentication required");
      assert.equal(error.requestId, "body-request-id");
      assert.equal(error.status, 401);
      return true;
    }
  );
});

test("apiFetch handles network error safely", async () => {
  const api = createApiClient({
    fetchImpl: async () => {
      throw new Error("socket exploded with internal details");
    }
  });

  await assert.rejects(
    () => api.apiFetch("/health"),
    (error) => {
      assert.equal(error instanceof ApiClientError, true);
      assert.equal(error.code, "NETWORK_ERROR");
      assert.equal(error.message, "Network request failed");
      return true;
    }
  );
});

test("catalog API calls list and detail endpoints", async () => {
  const calls = [];
  const apiClient = {
    async apiFetch(path) {
      calls.push(path);
      if (path === "/catalog/products") {
        return {
          data: {
            products: [
              {
                code: "NB-001",
                nameEn: "Titanium Labret"
              }
            ]
          }
        };
      }
      return {
        data: {
          product: {
            code: "NB-001",
            nameEn: "Titanium Labret"
          }
        }
      };
    }
  };
  const catalogApi = createCatalogApi(apiClient);

  const list = await catalogApi.getCatalogProducts();
  const detail = await catalogApi.getCatalogProduct("NB-001");

  assert.deepEqual(calls, ["/catalog/products", "/catalog/products/NB-001"]);
  assert.equal(list[0].code, "NB-001");
  assert.equal(detail.code, "NB-001");
});

test("buyer API requires and passes token to buyer/me", async () => {
  const apiClient = {
    async apiFetch(path, options) {
      assert.equal(path, "/buyer/me");
      assert.equal(options.token, "buyer-token");
      return {
        data: {
          profile: {
            status: "approved"
          }
        }
      };
    }
  };
  const buyerApi = createBuyerApi(apiClient);

  await assert.rejects(() => buyerApi.getCurrentBuyerProfile(), { code: "UNAUTHORIZED" });
  const profile = await buyerApi.getCurrentBuyerProfile("buyer-token");

  assert.equal(profile.status, "approved");
});

test("catalog adapter does not invent protected price fields", async () => {
  const catalogApi = createCatalogApi({
    async apiFetch() {
      return {
        data: {
          products: [
            {
              code: "NB-001",
              nameEn: "Titanium Labret"
            }
          ]
        }
      };
    }
  });

  const products = await catalogApi.getCatalogProducts();

  assert.equal("price" in products[0], false);
  assert.equal("wholesalePrice" in products[0], false);
  assert.equal("priceSnapshot" in products[0], false);
});
