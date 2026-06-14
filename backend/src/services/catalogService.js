import { notFound } from "../utils/errors.js";

function stripProtectedFields(product) {
  const { price, wholesalePrice, priceSnapshot, ...publicProduct } = product;
  return publicProduct;
}

export function createCatalogService({ pool, queries }) {
  return {
    async listProducts({ viewer } = {}) {
      const products = await queries.listVisibleProducts(pool);
      // The frontend mock viewerState is not trusted for price access.
      // Protected prices will only be added after backend-approved buyer checks.
      return products.map(stripProtectedFields);
    },

    async getProductByCode(productCode, { viewer } = {}) {
      const product = await queries.getVisibleProductByCode(pool, productCode);
      if (!product) {
        throw notFound("Product not found");
      }
      return stripProtectedFields(product);
    }
  };
}
