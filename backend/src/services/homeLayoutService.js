import { cloneDefaultHomeLayout, normalizeHomeLayout } from "../config/homeLayoutConfig.js";

export function createHomeLayoutService({ queries }) {
  return {
    async getPublishedLayout() {
      const stored = await queries.getLayout();
      const hasPublishedConfig = stored?.publishedConfig && Object.keys(stored.publishedConfig).length > 0;
      return {
        config: hasPublishedConfig
          ? normalizeHomeLayout(stored.publishedConfig)
          : cloneDefaultHomeLayout(),
        revision: stored?.publishedRevision || 1,
        publishedAt: stored?.publishedAt || null
      };
    }
  };
}
