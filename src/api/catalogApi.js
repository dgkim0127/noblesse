export function createCatalogApi(apiClient) {
  return {
    async getCatalogProducts() {
      const response = await apiClient.apiFetch("/catalog/products");
      return response.data?.products || [];
    },

    async getCatalogBanners() {
      const response = await apiClient.apiFetch("/catalog/banners");
      return response.data?.banners || [];
    },

    async getCatalogProduct(productCode) {
      const response = await apiClient.apiFetch(`/catalog/products/${encodeURIComponent(productCode)}`);
      return response.data?.product || null;
    }
  };
}
