import {
  cloneDefaultHomeLayout,
  getHomeLayoutCompletion,
  normalizeHomeLayout
} from "../config/homeLayoutConfig.js";
import { validationError } from "../utils/errors.js";
import { rejectUnknownFields } from "../utils/validators.js";

function parseRevision(value) {
  const revision = Number(value);
  if (!Number.isInteger(revision) || revision < 1) {
    throw validationError("A valid home layout revision is required");
  }
  return revision;
}

function normalizeStored(config) {
  return config && Object.keys(config).length > 0
    ? normalizeHomeLayout(config)
    : cloneDefaultHomeLayout();
}

function present(stored) {
  const draftConfig = normalizeStored(stored?.draftConfig);
  const publishedConfig = normalizeStored(stored?.publishedConfig);
  return {
    draftConfig,
    publishedConfig,
    draftRevision: stored?.draftRevision || 1,
    publishedRevision: stored?.publishedRevision || 1,
    updatedAt: stored?.updatedAt || null,
    publishedAt: stored?.publishedAt || null,
    completion: getHomeLayoutCompletion(draftConfig)
  };
}

export function createAdminHomeLayoutService({ queries }) {
  return {
    async getLayout() {
      return present(await queries.getLayout());
    },

    async saveDraft(body = {}, adminViewer) {
      const safeBody = rejectUnknownFields(body, ["config", "expectedRevision"]);
      const config = normalizeHomeLayout(safeBody.config);
      const expectedRevision = parseRevision(safeBody.expectedRevision);
      return present(await queries.saveDraft(config, expectedRevision, adminViewer));
    },

    async publish(body = {}, adminViewer) {
      const safeBody = rejectUnknownFields(body, ["expectedRevision"]);
      const expectedRevision = parseRevision(safeBody.expectedRevision);
      const stored = await queries.getLayout();
      const draftConfig = normalizeStored(stored?.draftConfig);
      const completion = getHomeLayoutCompletion(draftConfig);
      if (!completion.isPublishable) {
        throw validationError(`Home layout is incomplete: ${completion.missing.join(", ")}`);
      }
      return present(await queries.publish(expectedRevision, adminViewer));
    },

    async resetDraft(body = {}, adminViewer) {
      const safeBody = rejectUnknownFields(body, ["expectedRevision"]);
      return present(await queries.resetDraft(parseRevision(safeBody.expectedRevision), adminViewer));
    }
  };
}
