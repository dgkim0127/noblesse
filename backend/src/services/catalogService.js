import { notFound } from "../utils/errors.js";

function stripPrivateImageFields(imageSet = {}) {
  const stripSourceFields = (sources) => {
    if (!sources || typeof sources !== "object" || Array.isArray(sources)) return sources;
    return Object.fromEntries(Object.entries(sources).map(([variant, source]) => {
      if (!source || typeof source !== "object" || Array.isArray(source)) return [variant, source];
      const safeSource = { ...source };
      delete safeSource.objectKey;
      return [variant, safeSource];
    }));
  };
  const safeImageSet = { ...(imageSet || {}) };
  delete safeImageSet.objectKeys;
  delete safeImageSet.objectKey;
  safeImageSet.sources = stripSourceFields(safeImageSet.sources);
  return {
    ...safeImageSet,
    gallery: Array.isArray(safeImageSet.gallery)
      ? safeImageSet.gallery.map((image) => {
          const safeImage = { ...(image || {}) };
          delete safeImage.objectKeys;
          delete safeImage.objectKey;
          safeImage.sources = stripSourceFields(safeImage.sources);
          return safeImage;
        })
      : safeImageSet.gallery
  };
}

function stripProtectedFields(product) {
  const publicProduct = { ...product };
  delete publicProduct.price;
  delete publicProduct.wholesalePrice;
  delete publicProduct.priceSnapshot;
  publicProduct.imageSet = stripPrivateImageFields(publicProduct.imageSet);
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
