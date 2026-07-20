import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import sharp from "sharp";
import { createApp } from "../src/app.js";
import { createAdminRoutes } from "../src/routes/adminRoutes.js";
import { createAdminProductImageService, transformProductImage } from "../src/services/adminProductImageService.js";
import { createAdminProductService } from "../src/services/adminProductService.js";
import { errorHandler } from "../src/middleware/errorHandler.js";
import { requestId } from "../src/middleware/requestId.js";
import { unauthorized } from "../src/utils/errors.js";
import { request } from "./testClient.js";

const productId = "11111111-1111-4111-8111-111111111111";
const pngBytes = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d
]);

function multipartBody({ boundary = "noblesse-test-boundary", file = pngBytes, contentType = "image/png", metadata = {} } = {}) {
  const chunks = [
    Buffer.from(`--${boundary}\r\ncontent-disposition: form-data; name="metadata"\r\ncontent-type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n`),
    Buffer.from(`--${boundary}\r\ncontent-disposition: form-data; name="images"; filename="photo.png"\r\ncontent-type: ${contentType}\r\n\r\n`),
    file,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ];
  return {
    body: Buffer.concat(chunks),
    contentType: `multipart/form-data; boundary=${boundary}`
  };
}

function multipartManifestBody({ boundary = "noblesse-manifest-boundary", files = [], metadata = {} } = {}) {
  const chunks = [
    Buffer.from(`--${boundary}\r\ncontent-disposition: form-data; name="metadata"\r\ncontent-type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n`)
  ];
  files.forEach((file, index) => {
    chunks.push(
      Buffer.from(`--${boundary}\r\ncontent-disposition: form-data; name="images"; filename="${file.filename || `photo-${index}.png`}"\r\ncontent-type: ${file.contentType || "image/png"}\r\n\r\n`),
      file.buffer || pngBytes,
      Buffer.from("\r\n")
    );
  });
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return {
    body: Buffer.concat(chunks),
    contentType: `multipart/form-data; boundary=${boundary}`
  };
}

function createImageApp({ getProduct = async () => null, updateProductImages, objectStore }) {
  const queries = {
    async getProduct(...args) {
      return getProduct(...args);
    },
    async updateProductImages(...args) {
      return updateProductImages(...args);
    }
  };
  return createApp({
    env: { nodeEnv: "test", isProduction: false, allowedOrigins: [], firebaseStorageBucket: "test-bucket" },
    services: {
      admin: {
        dashboard: {},
        inquiries: {},
        buyers: {},
        products: createAdminProductService({
          queries,
          imageService: createAdminProductImageService({
            queries,
            objectStore,
            imageTransformer: async (buffer) => ({
              thumb: Buffer.from(buffer),
              card: Buffer.from(buffer),
              detail: Buffer.from(buffer),
              zoom: Buffer.from(buffer)
            })
          })
        })
      }
    },
    auth: {
      adminVerifier: { async verifyIdToken() { return { uid: "admin-uid" }; } },
      async loadAdminUserByAuthUid() {
        return { userId: "admin-1", role: "admin", status: "approved" };
      }
    },
    objectStore
  });
}

function createAuthOrderApp() {
  let parserCalled = false;
  let serviceCalled = false;
  const app = express();
  app.use(requestId);
  app.use(
    "/api/admin",
    createAdminRoutes({
      services: {
        products: {
          uploadProductImages() {
            serviceCalled = true;
            throw new Error("upload service should not run before auth");
          }
        }
      },
      requireAdmin(_req, _res, next) {
        next(unauthorized());
      },
      imageUploadParser(_req, _res, next) {
        parserCalled = true;
        next();
      }
    })
  );
  app.use(errorHandler);
  return {
    app,
    wasParserCalled: () => parserCalled,
    wasServiceCalled: () => serviceCalled
  };
}

test("POST /api/admin/products/:productId/images stores images and updates product metadata", async () => {
  const saved = [];
  const deleted = [];
  let receivedInput;
  const objectStore = {
    async save(input) {
      saved.push(input);
    },
    async deleteMany(keys) {
      deleted.push(...keys);
    }
  };
  const app = createImageApp({
    objectStore,
    async updateProductImages(id, input) {
      receivedInput = input;
      return {
        product: {
          id,
          code: "NB-IMG",
          imageSet: input.imageSet,
          imageAlt: input.imageAlt
        },
        auditLogId: "audit-image-1"
      };
    }
  });
  const multipart = multipartBody({ metadata: { primaryIndex: 0, altTexts: ["Primary alt"] } });

  const response = await request(app, `/api/admin/products/${productId}/images`, {
    method: "POST",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": multipart.contentType
    },
    body: multipart.body
  });

  assert.equal(response.status, 201);
  assert.equal(saved.length, 4);
  assert.equal(deleted.length, 0);
  assert.ok(saved.every((entry) => entry.contentType === "image/webp"));
  assert.ok(saved.every((entry) => /^products\/11111111-1111-4111-8111-111111111111\//.test(entry.objectKey)));
  assert.ok(["thumb", "card", "detail", "zoom"].every((variant) => receivedInput.imageSet[variant]));
  assert.match(receivedInput.imageSet.card, /^\/api\/catalog\/media\//);
  assert.equal(receivedInput.imageSet.gallery[0].isPrimary, true);
  assert.equal(receivedInput.imageAlt.default, "Primary alt");
  assert.equal(response.body.data.auditLogId, "audit-image-1");
});

test("product image variants preserve the source aspect ratio", async () => {
  const source = await sharp({
    create: { width: 240, height: 120, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
  }).png().toBuffer();
  const variants = await transformProductImage(source);

  for (const buffer of Object.values(variants)) {
    const metadata = await sharp(buffer).metadata();
    assert.equal(metadata.width / metadata.height, 2);
  }
});

test("manifest image upload preserves retained objects, appends new files, and makes the first item primary", async () => {
  const saved = [];
  const deleted = [];
  let receivedInput;
  const existingImage = (id, prefix, sortOrder) => ({
    id,
    filename: `${prefix}.webp`,
    thumb: `/media/${prefix}-thumb`,
    card: `/media/${prefix}-card`,
    detail: `/media/${prefix}-detail`,
    zoom: `/media/${prefix}-zoom`,
    objectKeys: {
      thumb: `products/${productId}/${prefix}-thumb.webp`,
      card: `products/${productId}/${prefix}-card.webp`,
      detail: `products/${productId}/${prefix}-detail.webp`,
      zoom: `products/${productId}/${prefix}-zoom.webp`
    },
    sortOrder,
    isPrimary: sortOrder === 0,
    position: { x: 50, y: 50 },
    scale: 1
  });
  const first = existingImage("existing-1", "first", 0);
  const second = existingImage("existing-2", "second", 1);
  const replacedObjectKeys = [...Object.values(first.objectKeys), ...Object.values(second.objectKeys)];
  const objectStore = {
    async save(input) {
      saved.push(input.objectKey);
    },
    async deleteMany(keys) {
      deleted.push(...keys);
    }
  };
  const app = createImageApp({
    objectStore,
    async getProduct() {
      return {
        id: productId,
        isVisible: true,
        imageSet: { gallery: [first, second], ...first },
        imageAlt: { gallery: [{ id: first.id, altText: "First" }, { id: second.id, altText: "Second" }] }
      };
    },
    async updateProductImages(id, input) {
      receivedInput = input;
      return {
        product: { id, imageSet: input.imageSet, imageAlt: input.imageAlt },
        auditLogId: "audit-manifest-1",
        replacedObjectKeys
      };
    }
  });
  const multipart = multipartManifestBody({
    files: [{ filename: "03-new.png" }],
    metadata: {
      items: [
        { existingId: second.id, altText: "Second updated", position: { x: 68, y: 24 }, scale: 1.6 },
        { uploadIndex: 0, altText: "New image", position: { x: 35, y: 55 }, scale: 1.2 }
      ],
      localizedAlt: { kr: "상품" }
    }
  });

  const response = await request(app, `/api/admin/products/${productId}/images`, {
    method: "POST",
    headers: { authorization: "Bearer admin-token", "content-type": multipart.contentType },
    body: multipart.body
  });

  assert.equal(response.status, 201);
  assert.equal(saved.length, 4);
  assert.deepEqual(new Set(deleted), new Set(Object.values(first.objectKeys)));
  assert.equal(receivedInput.imageSet.gallery.length, 2);
  assert.equal(receivedInput.imageSet.gallery[0].id, second.id);
  assert.equal(receivedInput.imageSet.gallery[0].isPrimary, true);
  assert.deepEqual(receivedInput.imageSet.gallery[0].position, { x: 68, y: 24 });
  assert.equal(receivedInput.imageSet.gallery[0].scale, 1.6);
  assert.equal(receivedInput.imageSet.gallery[1].filename, "03-new.png");
  assert.equal(receivedInput.imageSet.detail, second.detail);
  assert.equal(receivedInput.imageAlt.gallery[0].altText, "Second updated");
});

test("manifest reorder without uploads keeps existing Storage objects", async () => {
  const saved = [];
  const deleted = [];
  let receivedInput;
  const gallery = ["one", "two"].map((id, index) => ({
    id,
    filename: `${id}.webp`,
    thumb: `/media/${id}-thumb`,
    card: `/media/${id}-card`,
    detail: `/media/${id}-detail`,
    zoom: `/media/${id}-zoom`,
    objectKeys: Object.fromEntries(["thumb", "card", "detail", "zoom"].map((variant) => [variant, `products/${productId}/${id}-${variant}.webp`])),
    sortOrder: index
  }));
  const allKeys = gallery.flatMap((image) => Object.values(image.objectKeys));
  const app = createImageApp({
    objectStore: {
      async save(input) { saved.push(input.objectKey); },
      async deleteMany(keys) { deleted.push(...keys); }
    },
    async getProduct() {
      return { id: productId, isVisible: false, imageSet: { gallery }, imageAlt: {} };
    },
    async updateProductImages(id, input) {
      receivedInput = input;
      return { product: { id, ...input }, replacedObjectKeys: allKeys };
    }
  });
  const multipart = multipartManifestBody({
    metadata: {
      items: [
        { existingId: "two", position: { x: 50, y: 50 }, scale: 1 },
        { existingId: "one", position: { x: 50, y: 50 }, scale: 1 }
      ]
    }
  });

  const response = await request(app, `/api/admin/products/${productId}/images`, {
    method: "POST",
    headers: { authorization: "Bearer admin-token", "content-type": multipart.contentType },
    body: multipart.body
  });

  assert.equal(response.status, 201);
  assert.deepEqual(receivedInput.imageSet.gallery.map((image) => image.id), ["two", "one"]);
  assert.equal(receivedInput.imageSet.gallery[0].isPrimary, true);
  assert.equal(saved.length, 0);
  assert.equal(deleted.length, 0);
});

test("manifest validation rejects an empty visible gallery and invalid presentation values", async () => {
  let updates = 0;
  const product = {
    id: productId,
    isVisible: true,
    imageSet: {
      gallery: [{ id: "one", detail: "/one.webp", objectKeys: { detail: `products/${productId}/one.webp` } }]
    },
    imageAlt: {}
  };
  const app = createImageApp({
    objectStore: { async save() {}, async deleteMany() {} },
    async getProduct() { return product; },
    async updateProductImages() { updates += 1; return null; }
  });

  const empty = multipartManifestBody({ metadata: { items: [] } });
  const emptyResponse = await request(app, `/api/admin/products/${productId}/images`, {
    method: "POST",
    headers: { authorization: "Bearer admin-token", "content-type": empty.contentType },
    body: empty.body
  });
  assert.equal(emptyResponse.status, 400);

  const invalid = multipartManifestBody({
    metadata: { items: [{ existingId: "one", position: { x: 101, y: 50 }, scale: 3 }] }
  });
  const invalidResponse = await request(app, `/api/admin/products/${productId}/images`, {
    method: "POST",
    headers: { authorization: "Bearer admin-token", "content-type": invalid.contentType },
    body: invalid.body
  });
  assert.equal(invalidResponse.status, 400);
  assert.equal(updates, 0);
});

test("POST /api/admin/products/:productId/images rejects unauthenticated multipart before parsing", async () => {
  const authOrder = createAuthOrderApp();
  const multipart = multipartBody();

  const response = await request(authOrder.app, `/api/admin/products/${productId}/images`, {
    method: "POST",
    headers: {
      "content-type": multipart.contentType
    },
    body: multipart.body
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, "UNAUTHORIZED");
  assert.equal(authOrder.wasParserCalled(), false);
  assert.equal(authOrder.wasServiceCalled(), false);
});

test("POST /api/admin/products/:productId/images rejects invalid tokens before parsing", async () => {
  const authOrder = createAuthOrderApp();
  const multipart = multipartBody();

  const response = await request(authOrder.app, `/api/admin/products/${productId}/images`, {
    method: "POST",
    headers: {
      authorization: "Bearer invalid-token",
      "content-type": multipart.contentType
    },
    body: multipart.body
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, "UNAUTHORIZED");
  assert.equal(authOrder.wasParserCalled(), false);
  assert.equal(authOrder.wasServiceCalled(), false);
});

test("POST /api/admin/products/:productId/images rejects unauthenticated large multipart before parsing", async () => {
  const authOrder = createAuthOrderApp();
  const boundary = "noblesse-large-unauthenticated-boundary";
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\ncontent-disposition: form-data; name="images"; filename="large.png"\r\ncontent-type: image/png\r\n\r\n`),
    Buffer.alloc(83 * 1024 * 1024, 0),
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);

  const response = await request(authOrder.app, `/api/admin/products/${productId}/images`, {
    method: "POST",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`
    },
    body
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, "UNAUTHORIZED");
  assert.equal(authOrder.wasParserCalled(), false);
  assert.equal(authOrder.wasServiceCalled(), false);
});

test("POST /api/admin/products/:productId/images rejects malformed admin multipart safely", async () => {
  const objectStore = { async save() {}, async deleteMany() {} };
  const app = createImageApp({
    objectStore,
    async updateProductImages() {
      throw new Error("should not update");
    }
  });
  const boundary = "noblesse-empty-boundary";
  const body = Buffer.from(`--${boundary}--\r\n`);

  const response = await request(app, `/api/admin/products/${productId}/images`, {
    method: "POST",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": `multipart/form-data; boundary=${boundary}`
    },
    body
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("POST /api/admin/products/:productId/images rejects MIME and signature mismatches", async () => {
  const objectStore = { async save() {}, async deleteMany() {} };
  const app = createImageApp({
    objectStore,
    async updateProductImages() {
      throw new Error("should not update");
    }
  });
  const multipart = multipartBody({ contentType: "image/jpeg", file: pngBytes });

  const response = await request(app, `/api/admin/products/${productId}/images`, {
    method: "POST",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": multipart.contentType
    },
    body: multipart.body
  });

  assert.equal(response.status, 415);
  assert.equal(response.body.error.code, "UNSUPPORTED_MEDIA_TYPE");
});

test("POST /api/admin/products/:productId/images rejects too many images", async () => {
  const objectStore = { async save() {}, async deleteMany() {} };
  const app = createImageApp({
    objectStore,
    async updateProductImages() {
      throw new Error("should not update");
    }
  });
  const boundary = "noblesse-too-many-boundary";
  const chunks = [
    Buffer.from(`--${boundary}\r\ncontent-disposition: form-data; name="metadata"\r\ncontent-type: application/json\r\n\r\n{}\r\n`)
  ];
  for (let index = 0; index < 9; index += 1) {
    chunks.push(
      Buffer.from(`--${boundary}\r\ncontent-disposition: form-data; name="images"; filename="photo-${index}.png"\r\ncontent-type: image/png\r\n\r\n`),
      pngBytes,
      Buffer.from("\r\n")
    );
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));

  const response = await request(app, `/api/admin/products/${productId}/images`, {
    method: "POST",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": `multipart/form-data; boundary=${boundary}`
    },
    body: Buffer.concat(chunks)
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("POST /api/admin/products/:productId/images returns safe 413 for oversized admin payloads", async () => {
  const objectStore = { async save() {}, async deleteMany() {} };
  const app = createImageApp({
    objectStore,
    async updateProductImages() {
      throw new Error("should not update");
    }
  });
  const boundary = "noblesse-large-boundary";
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\ncontent-disposition: form-data; name="images"; filename="large.png"\r\ncontent-type: image/png\r\n\r\n`),
    Buffer.alloc(83 * 1024 * 1024, 0),
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);

  const response = await request(app, `/api/admin/products/${productId}/images`, {
    method: "POST",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": `multipart/form-data; boundary=${boundary}`
    },
    body
  });

  assert.equal(response.status, 413);
  assert.equal(response.body.error.code, "PAYLOAD_TOO_LARGE");
});

test("POST /api/admin/products/:productId/images cleans up uploaded objects when DB update fails", async () => {
  const saved = [];
  const deleted = [];
  const objectStore = {
    async save(input) {
      saved.push(input.objectKey);
    },
    async deleteMany(keys) {
      deleted.push(...keys);
    }
  };
  const app = createImageApp({
    objectStore,
    async updateProductImages() {
      throw new Error("fake db failure");
    }
  });
  const multipart = multipartBody();

  const response = await request(app, `/api/admin/products/${productId}/images`, {
    method: "POST",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": multipart.contentType
    },
    body: multipart.body
  });

  assert.equal(response.status, 500);
  assert.equal(saved.length, 4);
  assert.deepEqual(deleted, saved);
});

test("POST /api/admin/products/:productId/images cleans up uploaded objects when product is not found", async () => {
  const saved = [];
  const deleted = [];
  const objectStore = {
    async save(input) {
      saved.push(input.objectKey);
    },
    async deleteMany(keys) {
      deleted.push(...keys);
    }
  };
  const app = createImageApp({
    objectStore,
    async updateProductImages() {
      return null;
    }
  });
  const multipart = multipartBody();

  const response = await request(app, `/api/admin/products/${productId}/images`, {
    method: "POST",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": multipart.contentType
    },
    body: multipart.body
  });

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, "NOT_FOUND");
  assert.equal(saved.length, 4);
  assert.deepEqual(deleted, saved);
});

test("POST /api/admin/products/:productId/images preserves DB failure when cleanup fails", async () => {
  const saved = [];
  const objectStore = {
    async save(input) {
      saved.push(input.objectKey);
    },
    async deleteMany() {
      throw new Error("cleanup unavailable");
    }
  };
  const app = createImageApp({
    objectStore,
    async updateProductImages() {
      throw new Error("fake db failure");
    }
  });
  const multipart = multipartBody();

  const response = await request(app, `/api/admin/products/${productId}/images`, {
    method: "POST",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": multipart.contentType
    },
    body: multipart.body
  });

  assert.equal(response.status, 500);
  assert.equal(response.body.error.code, "INTERNAL_ERROR");
  assert.equal(saved.length, 4);
});
