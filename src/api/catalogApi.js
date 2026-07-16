export function createCatalogApi(apiClient) {
  return {
    async getCatalogProducts() {
      const response = await apiClient.apiFetch("/catalog/products");
      return response.data?.products || [];
    },

    async getHomeShowcase() {
      const response = await apiClient.apiFetch("/catalog/home-showcase");
      return response.data?.slides || [];
    },

    async getHomeLayout() {
      const response = await apiClient.apiFetch("/catalog/home-layout");
      return response.data?.config || null;
    },

    async getCatalogProduct(productCode) {
      const response = await apiClient.apiFetch(`/catalog/products/${encodeURIComponent(productCode)}`);
      return response.data?.product || null;
    }
  };
}
