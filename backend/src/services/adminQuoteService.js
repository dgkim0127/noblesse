import { conflict, notFound } from "../utils/errors.js";
import { createPaginationMeta, parsePagination, slicePageRows } from "../utils/pagination.js";
import {
  MARKETS,
  parseOptionalEnum,
  parseOptionalString,
  rejectUnknownFields,
  validationError,
  validateUuid
} from "../utils/validators.js";

const QUOTE_STATUSES = ["draft", "sent", "accepted", "cancelled"];

function parseQuoteFilters(filters) {
  const pagination = parsePagination(filters);
  return {
    status: parseOptionalEnum(filters.status, QUOTE_STATUSES, "status"),
    market: parseOptionalEnum(filters.market, MARKETS, "market"),
    q: parseOptionalString(filters.q, { maxLength: 120 }),
    limit: pagination.limit,
    offset: pagination.offset,
    dbLimit: pagination.dbLimit,
    nextCursor: pagination.nextCursor
  };
}

export function createAdminQuoteService({ queries }) {
  return {
    async listQuotes(filters = {}, adminViewer) {
      const parsed = parseQuoteFilters(filters);
      const quotes = await queries.listQuotes(parsed, { adminViewer });
      return {
        quotes: slicePageRows(quotes, parsed),
        meta: createPaginationMeta(parsed, undefined, quotes.length)
      };
    },

    async getQuoteById(quoteId, adminViewer) {
      const id = validateUuid(quoteId, "quoteId");
      const result = await queries.getQuoteById(id, { adminViewer });
      if (!result) {
        throw notFound("Quote not found");
      }
      return result;
    },

    async createQuote(body = {}, adminViewer) {
      const safeBody = rejectUnknownFields(body, ["inquiryId", "leadTime", "shippingNote", "adminMemo"]);
      const inquiryId = validateUuid(safeBody.inquiryId, "inquiryId");
      const quoteInput = {
        leadTime: parseOptionalString(safeBody.leadTime, { maxLength: 120 }),
        shippingNote: parseOptionalString(safeBody.shippingNote, { maxLength: 500 }),
        adminMemo: parseOptionalString(safeBody.adminMemo, { maxLength: 2000 })
      };
      const result = await queries.createQuoteFromInquiry(inquiryId, quoteInput, adminViewer);
      if (!result) {
        throw notFound("Inquiry not found");
      }
      if (result.conflictQuoteId) {
        throw conflict("Quote already exists for this inquiry");
      }
      return result;
    },

    async updateQuoteStatus(quoteId, body = {}, adminViewer) {
      const id = validateUuid(quoteId, "quoteId");
      const safeBody = rejectUnknownFields(body, ["status"]);
      const status = parseOptionalEnum(safeBody.status, QUOTE_STATUSES, "status");
      if (!status) {
        throw validationError("status is required");
      }
      const result = await queries.updateQuoteStatus(id, status, adminViewer);
      if (!result) {
        throw notFound("Quote not found");
      }
      return result;
    }
  };
}
