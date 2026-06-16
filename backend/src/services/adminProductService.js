import { createPaginationMeta, parsePagination } from "../utils/pagination.js";
import {
  MARKETS,
  parseBooleanLike,
  parseOptionalEnum,
  parseOptionalString
} from "../utils/validators.js";

function parseProductFilters(filters) {
  const pagination = parsePagination(filters);
  return {
    visible: parseBooleanLike(filters.visible, "visible"),
    category: parseOptionalString(filters.category, { maxLength: 80 }),
    q: parseOptionalString(filters.q, { maxLength: 120 }),
    market: parseOptionalEnum(filters.market, MARKETS, "market"),
    limit: pagination.limit,
    offset: pagination.offset,
    nextCursor: pagination.nextCursor
  };
}

export function createAdminProductService({ queries }) {
  return {
    async listProducts(filters = {}, adminViewer) {
      const parsed = parseProductFilters(filters);
      const products = await queries.listProducts(parsed, { adminViewer });
      return {
        products,
        meta: createPaginationMeta(parsed)
      };
    }
  };
}
