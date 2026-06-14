import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { notFound } from "../src/utils/errors.js";
import { request } from "./testClient.js";

function createCatalogMock() {
  const products = [
    {
      code: "NB-001",
      nameEn: "Titanium Labret",
      material: "Titanium"
    }
  ];

  return {
    async listProducts() {
      return products;
    },
    async getProductByCode(productCode) {
      const product = products.find((item) => item.code === productCode);
      if (!product) throw notFound("Product not found");
      return product;
    }
  };
}

test("GET /api/catalog/products returns product list", async () => {
  const app = createApp({
    env: { nodeEnv: "test", isProduction: false, allowedOrigins: [] },
    services: { catalog: createCatalogMock() }
  });

  const response = await request(app, "/api/catalog/products");

  assert.equal(response.status, 200);
  assert.equal(response.body.products.length, 1);
  assert.equal(response.body.products[0].code, "NB-001");
});

test("GET /api/catalog/products/:productCode returns product detail", async () => {
  const app = createApp({
    env: { nodeEnv: "test", isProduction: false, allowedOrigins: [] },
    services: { catalog: createCatalogMock() }
  });

  const response = await request(app, "/api/catalog/products/NB-001");

  assert.equal(response.status, 200);
  assert.equal(response.body.product.code, "NB-001");
});

test("GET /api/catalog/products/:productCode returns NOT_FOUND for unknown product", async () => {
  const app = createApp({
    env: { nodeEnv: "test", isProduction: false, allowedOrigins: [] },
    services: { catalog: createCatalogMock() }
  });

  const response = await request(app, "/api/catalog/products/NB-999");

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, "NOT_FOUND");
});
