import { notFound } from "../utils/errors.js";

function stripProtectedFields(product) {
  const publicProduct = { ...product };
  delete publicProduct.price;
  delete publicProduct.wholesalePrice;
  delete publicProduct.priceSnapshot;
  return publicProduct;
}

export function createCatalogService({ pool, queries }) {
  return {
    async listProducts() {
      const products = await queries.listVisibleProducts(pool);
      // The frontend mock viewerState is not trusted for price access.
      // Protected prices will only be added after backend-approved buyer checks.
      return products.map(stripProtectedFields);
    },

    async getProductByCode(productCode) {
      const product = await queries.getVisibleProductByCode(pool, productCode);
      if (!product) {
        throw notFound("Product not found");
      }
      return stripProtectedFields(product);
    }
  };
}
