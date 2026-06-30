import assert from "node:assert/strict";
import test from "node:test";
import { createBuyerApi } from "../src/api/buyerApi.js";
import { createAuthApi } from "../src/api/authApi.js";
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

test("buyer API calls price and inquiry endpoints with token", async () => {
  const calls = [];
  const apiClient = {
    async apiFetch(path, options) {
      calls.push({ path, options });
      if (path === "/buyer/product-prices") {
        return { data: { productPrices: [{ productCode: "NB-001", moq: 20 }] } };
      }
      if (path === "/buyer/inquiries?status=requested") {
        return { data: { data: { inquiries: [{ inquiryId: "inq-1" }] }, meta: { requestId: "req-1" } } };
      }
      if (path === "/buyer/inquiries/inq-1") {
        return { data: { data: { inquiry: { inquiryId: "inq-1", status: "quoted" } }, meta: { requestId: "req-detail" } } };
      }
      if (path === "/buyer/inquiries") {
        return { data: { data: { inquiry: { inquiryId: "inq-2" } }, meta: { requestId: "req-2" } } };
      }
      return { data: { data: { profile: { status: "pending" } }, meta: { requestId: "req-3" } } };
    }
  };
  const buyerApi = createBuyerApi(apiClient);

  const prices = await buyerApi.getProductPrices("buyer-token");
  const list = await buyerApi.getInquiries({ status: "requested" }, "buyer-token");
  const detail = await buyerApi.getInquiry("inq-1", "buyer-token");
  const created = await buyerApi.createInquiry({
    requestMemo: "Check stock",
    items: [{ productCode: "NB-001", color: "Silver", size: "6mm", quantity: 20 }]
  }, "buyer-token");
  const registered = await buyerApi.registerBuyer({
    email: "buyer@example.test",
    companyName: "Buyer Company",
    contactName: "Buyer Contact",
    country: "Japan",
    preferredLanguage: "jp",
    agreements: [{ key: "terms_of_service", version: "terms-v1.0", required: true, accepted: true }]
  }, "buyer-token");

  assert.equal(prices[0].productCode, "NB-001");
  assert.equal(list.data.inquiries[0].inquiryId, "inq-1");
  assert.equal(detail.data.inquiry.status, "quoted");
  assert.equal(created.data.inquiry.inquiryId, "inq-2");
  assert.equal(registered.data.profile.status, "pending");
  assert.deepEqual(calls.map((call) => call.path), [
    "/buyer/product-prices",
    "/buyer/inquiries?status=requested",
    "/buyer/inquiries/inq-1",
    "/buyer/inquiries",
    "/buyer/register"
  ]);
  assert.equal(calls[3].options.method, "POST");
  assert.equal(calls[3].options.token, "buyer-token");
  assert.deepEqual(calls[3].options.body.items[0], {
    productCode: "NB-001",
    color: "Silver",
    size: "6mm",
    quantity: 20
  });
  assert.equal(calls[4].options.method, "POST");
  assert.equal(calls[4].options.token, "buyer-token");
  assert.equal(calls[4].options.body.companyName, "Buyer Company");
});

test("auth API resolves login identifier without sending password", async () => {
  const calls = [];
  const authApi = createAuthApi({
    async apiFetch(path, options) {
      calls.push({ path, options });
      return { data: { data: { email: "admin@example.test" } } };
    }
  });

  const email = await authApi.resolveLoginIdentifier("admin");

  assert.equal(email, "admin@example.test");
  assert.deepEqual(calls, [{
    path: "/auth/resolve-login-identifier",
    options: {
      method: "POST",
      body: { identifier: "admin" }
    }
  }]);
  assert.equal("password" in calls[0].options.body, false);
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
