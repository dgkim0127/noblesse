import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createAdminRoutes } from "../src/routes/adminRoutes.js";
import { createAdminHomeShowcaseService } from "../src/services/adminHomeShowcaseService.js";
import { createHomeShowcaseService } from "../src/services/homeShowcaseService.js";
import { errorHandler } from "../src/middleware/errorHandler.js";
import { requestId } from "../src/middleware/requestId.js";
import { request } from "./testClient.js";

const slideId = "11111111-1111-4111-8111-111111111111";
const pngBytes = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d
]);
const completeTitle = {
  kr: "홈 스냅",
  en: "Home snap",
  jp: "ホームスナップ",
  "zh-TW": "首頁快照"
};

function baseSlide(overrides = {}) {
  return {
    id: slideId,
    internalName: "Primary snap",
    label: "NEW",
    title: completeTitle,
    eyebrow: {},
    description: {},
    targetUrl: "/products",
    imageSet: {},
    imageAlt: {},
    sortOrder: 0,
    isActive: false,
    ...overrides
  };
}

function createMemoryQueries(initialSlides = []) {
  let slides = initialSlides.map((slide) => ({ ...slide }));
  return {
    async listPublicSlides() {
      return slides.filter((slide) => slide.isActive);
    },
    async listAdminSlides() {
      return slides;
    },
    async getSlide(id) {
      return slides.find((slide) => slide.id === id) || null;
    },
    async createSlide(input) {
      const { imagePosition, ...fields } = input;
      const slide = baseSlide({
        ...fields,
        id: slideId,
        imageSet: { position: imagePosition || { x: 50, y: 50 } }
      });
      slides = [...slides, slide];
      return slide;
    },
    async updateSlide(id, input) {
      const existing = slides.find((slide) => slide.id === id);
      if (!existing) return null;
      const { imagePosition, ...fields } = input;
      const updated = {
        ...existing,
        ...fields,
        imageSet: imagePosition
          ? { ...existing.imageSet, position: imagePosition }
          : existing.imageSet
      };
      slides = slides.map((slide) => slide.id === id ? updated : slide);
      return updated;
    },
    async updateSlideImage(id, input) {
      const existing = slides.find((slide) => slide.id === id);
      if (!existing) return null;
      const updated = { ...existing, ...input };
      slides = slides.map((slide) => slide.id === id ? updated : slide);
      return { slide: updated, replacedObjectKeys: Object.values(existing.imageSet?.objectKeys || {}) };
    },
    async reorderSlides(ids) {
      slides = ids.map((id, index) => ({ ...slides.find((slide) => slide.id === id), sortOrder: index }));
      return slides;
    },
    async deleteSlide(id) {
      const slide = slides.find((item) => item.id === id);
      if (!slide) return null;
      slides = slides.filter((item) => item.id !== id);
      return { slide, objectKeys: Object.values(slide.imageSet?.objectKeys || {}) };
    }
  };
}

function multipartImage(boundary = "home-showcase-boundary") {
  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    body: Buffer.concat([
      Buffer.from(`--${boundary}\r\ncontent-disposition: form-data; name="image"; filename="snap.png"\r\ncontent-type: image/png\r\n\r\n`),
      pngBytes,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ])
  };
}

test("public home showcase omits private storage object keys", async () => {
  const service = createHomeShowcaseService({
    queries: createMemoryQueries([
      baseSlide({
        isActive: true,
        imageSet: {
          detail: "/api/catalog/media/safe",
          position: { x: 0, y: 100 },
          objectKeys: { detail: "home-showcase/private.webp" }
        }
      })
    ])
  });

  const slides = await service.listPublicSlides();

  assert.equal(slides.length, 1);
  assert.equal(slides[0].imageSet.detail, "/api/catalog/media/safe");
  assert.deepEqual(slides[0].imageSet.position, { x: 0, y: 100 });
  assert.equal("objectKeys" in slides[0].imageSet, false);
  assert.equal("internalName" in slides[0], false);
  assert.equal("isActive" in slides[0], false);
});

test("home showcase drafts allow partial translations but publishing requires all titles and an image", async () => {
  const service = createAdminHomeShowcaseService({
    queries: createMemoryQueries(),
    objectStore: { async save() {}, async deleteMany() {} }
  });

  const draft = await service.createSlide({
    internalName: "Draft snap",
    title: { kr: "초안" },
    imagePosition: { x: 100, y: 0 },
    targetUrl: "/products"
  });

  assert.equal(draft.isActive, false);
  assert.deepEqual(draft.imageSet.position, { x: 100, y: 0 });
  assert.equal(draft.completion.isPublishable, false);
  await assert.rejects(
    () => service.updateSlide(slideId, { imagePosition: { x: 101, y: 50 } }),
    /imagePosition coordinates/
  );
  await assert.rejects(
    () => service.updateSlide(slideId, { isActive: true }),
    /Home showcase slide is incomplete/
  );
});

test("home showcase image upload creates four WebP variants and enables publishing", async () => {
  const saved = [];
  const deleted = [];
  const queries = createMemoryQueries([baseSlide({ imageSet: { position: { x: 0, y: 50 } } })]);
  const service = createAdminHomeShowcaseService({
    queries,
    objectStore: {
      async save(input) { saved.push(input); },
      async deleteMany(keys) { deleted.push(...keys); }
    },
    imageTransformer: async () => ({
      thumb: Buffer.from("thumb"),
      card: Buffer.from("card"),
      detail: Buffer.from("detail"),
      zoom: Buffer.from("zoom")
    })
  });
  const upload = multipartImage();

  const uploaded = await service.uploadImage(slideId, upload, { userId: "admin-1" });
  const published = await service.updateSlide(slideId, { isActive: true }, { userId: "admin-1" });

  assert.equal(saved.length, 4);
  assert.ok(saved.every((entry) => entry.objectKey.startsWith(`home-showcase/${slideId}/`)));
  assert.equal(deleted.length, 0);
  assert.deepEqual(uploaded.imageSet.position, { x: 0, y: 50 });
  assert.equal(uploaded.completion.isPublishable, true);
  assert.equal(published.isActive, true);
});

test("home showcase publish route requires catalog.publish", async () => {
  let updateCalled = false;
  const app = express();
  app.use(requestId);
  app.use(express.json());
  app.use(
    "/api/admin",
    createAdminRoutes({
      services: {
        homeShowcase: {
          async updateSlide() {
            updateCalled = true;
            return baseSlide({ isActive: true });
          }
        }
      },
      requireAdmin(req, _res, next) {
        req.adminViewer = { permissions: ["catalog.write"] };
        next();
      }
    })
  );
  app.use(errorHandler);

  const response = await request(app, `/api/admin/home-showcase/${slideId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ isActive: true })
  });

  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, "FORBIDDEN");
  assert.equal(updateCalled, false);
});
