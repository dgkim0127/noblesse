import { createPaginationMeta, parsePagination } from "../utils/pagination.js";
import {
  MARKETS,
  USER_STATUSES,
  parseOptionalEnum,
  parseOptionalString
} from "../utils/validators.js";

function parseBuyerFilters(filters) {
  const pagination = parsePagination(filters);
  return {
    status: parseOptionalEnum(filters.status, USER_STATUSES, "status"),
    market: parseOptionalEnum(filters.market, MARKETS, "market"),
    country: parseOptionalString(filters.country, { maxLength: 2 }),
    q: parseOptionalString(filters.q, { maxLength: 120 }),
    limit: pagination.limit,
    offset: pagination.offset,
    nextCursor: pagination.nextCursor
  };
}

export function createAdminBuyerService({ queries }) {
  return {
    async listBuyers(filters = {}, adminViewer) {
      const parsed = parseBuyerFilters(filters);
      const buyers = await queries.listBuyers(parsed, { adminViewer });
      return {
        buyers,
        meta: createPaginationMeta(parsed)
      };
    }
  };
}
