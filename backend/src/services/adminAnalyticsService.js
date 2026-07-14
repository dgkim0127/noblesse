export function createAdminAnalyticsService({ queries }) {
  return {
    async getAnalytics(adminViewer) {
      return queries.getAnalyticsSummary({ adminViewer });
    }
  };
}
