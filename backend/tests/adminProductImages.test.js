import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createApp } from "../src/app.js";
import { createAdminRoutes } from "../src/routes/adminRoutes.js";
import { createAdminProductImageService } from "../src/services/adminProductImageService.js";
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

function createImageApp({ updateProductImages, objectStore }) {
  const queries = {
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
          imageService: createAdminProductImageService({ queries, objectStore })
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
  assert.equal(saved.length, 1);
  assert.equal(deleted.length, 0);
  assert.equal(saved[0].contentType, "image/png");
  assert.match(saved[0].objectKey, /^products\/11111111-1111-4111-8111-111111111111\//);
  assert.match(receivedInput.imageSet.card, /^\/api\/catalog\/media\//);
  assert.equal(receivedInput.imageSet.gallery[0].isPrimary, true);
  assert.equal(receivedInput.imageAlt.default, "Primary alt");
  assert.equal(response.body.data.auditLogId, "audit-image-1");
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
  assert.equal(saved.length, 1);
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
  assert.equal(saved.length, 1);
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
  assert.equal(saved.length, 1);
});
