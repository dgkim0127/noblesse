import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { createCatalogService } from "../src/services/catalogService.js";
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

test("GET /api/catalog/products/:productCode returns VALIDATION_ERROR for invalid product code", async () => {
  const app = createApp({
    env: { nodeEnv: "test", isProduction: false, allowedOrigins: [] },
    services: { catalog: createCatalogMock() }
  });

  const response = await request(app, "/api/catalog/products/bad!");

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
  assert.match(response.body.error.requestId, /.+/);
});

test("catalog service does not expose protected price fields for public product reads", async () => {
  const catalogService = createCatalogService({
    pool: {},
    queries: {
      async listVisibleProducts() {
        return [
          {
            code: "NB-001",
            nameEn: "Titanium Labret",
            price: 12000,
            wholesalePrice: 9000,
            priceSnapshot: 9000,
            imageSet: {
              detail: "/media/detail",
              objectKeys: { detail: "products/private-detail.webp" },
              gallery: [{ id: "image-1", detail: "/media/detail", objectKeys: { detail: "products/private-detail.webp" }, sources: { detail: { url: "/media/detail", objectKey: "products/private-detail.webp" } } }]
            }
          }
        ];
      },
      async getVisibleProductByCode() {
        return {
          code: "NB-001",
          nameEn: "Titanium Labret",
          price: 12000,
          wholesalePrice: 9000,
          priceSnapshot: 9000,
          imageSet: {
            detail: "/media/detail",
            objectKeys: { detail: "products/private-detail.webp" },
            gallery: [{ id: "image-1", detail: "/media/detail", objectKeys: { detail: "products/private-detail.webp" }, sources: { detail: { url: "/media/detail", objectKey: "products/private-detail.webp" } } }]
          }
        };
      }
    }
  });

  const list = await catalogService.listProducts({ viewer: null });
  const detail = await catalogService.getProductByCode("NB-001", { viewer: null });

  assert.equal("price" in list[0], false);
  assert.equal("wholesalePrice" in list[0], false);
  assert.equal("priceSnapshot" in list[0], false);
  assert.equal("price" in detail, false);
  assert.equal("wholesalePrice" in detail, false);
  assert.equal("priceSnapshot" in detail, false);
  assert.equal("objectKeys" in list[0].imageSet, false);
  assert.equal("objectKeys" in list[0].imageSet.gallery[0], false);
  assert.equal("objectKeys" in detail.imageSet, false);
  assert.equal("objectKeys" in detail.imageSet.gallery[0], false);
  assert.equal("objectKey" in detail.imageSet.gallery[0].sources.detail, false);
});
