import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { createAdminProductImageService } from "../src/services/adminProductImageService.js";
import { createAdminProductService } from "../src/services/adminProductService.js";
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
