import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { cloneDefaultHomeLayout } from "../src/config/homeLayoutConfig.js";
import { errorHandler } from "../src/middleware/errorHandler.js";
import { requestId } from "../src/middleware/requestId.js";
import { createAdminRoutes } from "../src/routes/adminRoutes.js";
import { createAdminHomeLayoutService } from "../src/services/adminHomeLayoutService.js";
import { createHomeLayoutService } from "../src/services/homeLayoutService.js";
import { request } from "./testClient.js";

function createMemoryQueries() {
  let state = {
    draftConfig: {},
    publishedConfig: {},
    draftRevision: 1,
    publishedRevision: 1,
    updatedAt: null,
    publishedAt: null
  };
  return {
    async getLayout() {
      return structuredClone(state);
    },
    async saveDraft(config, expectedRevision) {
      assert.equal(expectedRevision, state.draftRevision);
      state = { ...state, draftConfig: structuredClone(config), draftRevision: state.draftRevision + 1 };
      return structuredClone(state);
    },
    async publish(expectedRevision) {
      assert.equal(expectedRevision, state.draftRevision);
      state = {
        ...state,
        publishedConfig: structuredClone(state.draftConfig),
        publishedRevision: state.draftRevision,
        publishedAt: new Date().toISOString()
      };
      return structuredClone(state);
    },
    async resetDraft(expectedRevision) {
      assert.equal(expectedRevision, state.draftRevision);
      state = {
        ...state,
        draftConfig: structuredClone(state.publishedConfig),
        draftRevision: state.draftRevision + 1
      };
      return structuredClone(state);
    }
  };
}

test("public home layout uses defaults and never exposes an unpublished draft", async () => {
  const queries = createMemoryQueries();
  const admin = createAdminHomeLayoutService({ queries });
  const publicService = createHomeLayoutService({ queries });
  const draft = cloneDefaultHomeLayout();
  draft.sections.find((section) => section.id === "new-arrival").title.kr = "관리자 초안";

  await admin.saveDraft({ config: draft, expectedRevision: 1 }, { userId: "admin-1" });
  const beforePublish = await publicService.getPublishedLayout();
  const publishedTitle = beforePublish.config.sections.find((section) => section.id === "new-arrival").title.kr;

  assert.equal(publishedTitle, "신상품");
  assert.equal(JSON.stringify(beforePublish).includes("관리자 초안"), false);
});

test("home layout publish copies the complete draft and preserves explicit revisions", async () => {
  const queries = createMemoryQueries();
  const admin = createAdminHomeLayoutService({ queries });
  const publicService = createHomeLayoutService({ queries });
  const draft = cloneDefaultHomeLayout();
  draft.sections.find((section) => section.id === "new-arrival").title.kr = "이번 주 신상품";

  const saved = await admin.saveDraft({ config: draft, expectedRevision: 1 }, { userId: "admin-1" });
  const published = await admin.publish({ expectedRevision: saved.draftRevision }, { userId: "admin-1" });
  const publicLayout = await publicService.getPublishedLayout();

  assert.equal(saved.draftRevision, 2);
  assert.equal(published.publishedRevision, 2);
  assert.equal(publicLayout.revision, 2);
  assert.equal(publicLayout.config.sections.find((section) => section.id === "new-arrival").title.kr, "이번 주 신상품");
});

test("home layout publish refuses incomplete localized copy", async () => {
  const queries = createMemoryQueries();
  const admin = createAdminHomeLayoutService({ queries });
  const draft = cloneDefaultHomeLayout();
  draft.sections.find((section) => section.id === "campaign").ctaLabel["zh-TW"] = "";
  const saved = await admin.saveDraft({ config: draft, expectedRevision: 1 }, { userId: "admin-1" });

  await assert.rejects(
    () => admin.publish({ expectedRevision: saved.draftRevision }, { userId: "admin-1" }),
    /Home layout is incomplete/
  );
});

test("home layout publish route requires catalog.publish", async () => {
  let called = false;
  const app = express();
  app.use(requestId);
  app.use(express.json());
  app.use("/api/admin", createAdminRoutes({
    services: {
      homeLayout: {
        async publish() {
          called = true;
          return {};
        }
      }
    },
    requireAdmin(req, _res, next) {
      req.adminViewer = { permissions: ["catalog.read", "catalog.write"] };
      next();
    }
  }));
  app.use(errorHandler);

  const response = await request(app, "/api/admin/home-layout/publish", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ expectedRevision: 1 })
  });

  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, "FORBIDDEN");
  assert.equal(called, false);
});
