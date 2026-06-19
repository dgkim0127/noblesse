import { createPaginationMeta, parsePagination, slicePageRows } from "../utils/pagination.js";
import {
  MARKETS,
  USER_STATUSES,
  parseOptionalEnum,
  parseOptionalString,
  rejectUnknownFields,
  validateUuid,
  validationError
} from "../utils/validators.js";
import { notFound } from "../utils/errors.js";

function parseBuyerFilters(filters) {
  const pagination = parsePagination(filters);
  return {
    status: parseOptionalEnum(filters.status, USER_STATUSES, "status"),
    market: parseOptionalEnum(filters.market, MARKETS, "market"),
    country: parseOptionalString(filters.country, { maxLength: 2 }),
    q: parseOptionalString(filters.q, { maxLength: 120 }),
    limit: pagination.limit,
    offset: pagination.offset,
    dbLimit: pagination.dbLimit,
    nextCursor: pagination.nextCursor
  };
}

export function createAdminBuyerService({ queries }) {
  return {
    async listBuyers(filters = {}, adminViewer) {
      const parsed = parseBuyerFilters(filters);
      const buyers = await queries.listBuyers(parsed, { adminViewer });
      return {
        buyers: slicePageRows(buyers, parsed),
        meta: createPaginationMeta(parsed, undefined, buyers.length)
      };
    },

    async getBuyerById(buyerId, adminViewer) {
      const id = validateUuid(buyerId, "buyerId");
      const result = await queries.getBuyerById(id, { adminViewer });
      if (!result) {
        throw notFound("Buyer not found");
      }
      return result;
    },

    async updateBuyerStatus(buyerId, body = {}, adminViewer) {
      const id = validateUuid(buyerId, "buyerId");
      const safeBody = rejectUnknownFields(body, ["status"]);
      const status = parseOptionalEnum(safeBody.status, USER_STATUSES, "status");
      if (!status) {
        throw validationError("status is required");
      }

      const result = await queries.updateBuyerStatus(id, status, adminViewer);
      if (!result) {
        throw notFound("Buyer not found");
      }
      return result;
    }
  };
}
