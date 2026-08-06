import { isQuoteEnabledBuyerLifecycle } from "../auth/buyerLifecycle.js";
import { forbidden, notFound, validationError } from "../utils/errors.js";

const productCodePattern = /^[A-Z0-9][A-Z0-9-]{1,39}$/i;

export const recentProductLimit = 10;
export const recentProductRetentionDays = 90;

function requireActiveBuyer(viewer) {
  if (!isQuoteEnabledBuyerLifecycle(viewer)) {
    throw forbidden("Active buyer account required");
  }
  return viewer;
}

function parseProductCode(value) {
  if (typeof value !== "string" || !productCodePattern.test(value.trim())) {
    throw validationError("Invalid productCode");
  }
  return value.trim().toUpperCase();
}

export function createBuyerRecentProductService({ queries }) {
  const historyPolicy = {
    limit: recentProductLimit,
    retentionDays: recentProductRetentionDays
  };

  return {
    async listRecentProducts(viewer) {
      const buyer = requireActiveBuyer(viewer);
      return queries.listRecentProducts(buyer, historyPolicy);
    },

    async recordProductView(productCode, viewer) {
      const buyer = requireActiveBuyer(viewer);
      const recentProduct = await queries.recordProductView(
        buyer,
        parseProductCode(productCode),
        historyPolicy
      );
      if (!recentProduct) {
        throw notFound("Product not found");
      }
      return recentProduct;
    }
  };
}
