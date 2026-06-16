export function createAdminDashboardService({ queries }) {
  return {
    async getDashboard(adminViewer) {
      return queries.getDashboardSummary({ adminViewer });
    }
  };
}
