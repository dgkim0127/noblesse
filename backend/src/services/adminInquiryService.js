import { notFound } from "../utils/errors.js";
import { createPaginationMeta, parsePagination, slicePageRows } from "../utils/pagination.js";
import {
  INQUIRY_STATUSES,
  MARKETS,
  parseOptionalEnum,
  parseOptionalString,
  parseRequiredString,
  rejectUnknownFields,
  validateUuid,
  validationError
} from "../utils/validators.js";

function parseInquiryFilters(filters) {
  const pagination = parsePagination(filters);
  return {
    status: parseOptionalEnum(filters.status, INQUIRY_STATUSES, "status"),
    market: parseOptionalEnum(filters.market, MARKETS, "market"),
    q: parseOptionalString(filters.q, { maxLength: 120 }),
    limit: pagination.limit,
    offset: pagination.offset,
    dbLimit: pagination.dbLimit,
    nextCursor: pagination.nextCursor
  };
}

export function createAdminInquiryService({ queries }) {
  return {
    async listInquiries(filters = {}, adminViewer) {
      const parsed = parseInquiryFilters(filters);
      const inquiries = await queries.listInquiries(parsed, { adminViewer });
      return {
        inquiries: slicePageRows(inquiries, parsed),
        meta: createPaginationMeta(parsed, undefined, inquiries.length)
      };
    },

    async getInquiryById(inquiryId, adminViewer) {
      const id = validateUuid(inquiryId, "inquiryId");
      const inquiry = await queries.getInquiryById(id, { adminViewer });
      if (!inquiry) {
        throw notFound("Inquiry not found");
      }
      return inquiry;
    },

    async updateInquiryMemo(inquiryId, body = {}, adminViewer) {
      const id = validateUuid(inquiryId, "inquiryId");
      const safeBody = rejectUnknownFields(body, ["adminMemo"]);
      const adminMemo = parseRequiredString(safeBody.adminMemo, {
        maxLength: 2000,
        fieldName: "adminMemo"
      });

      const result = await queries.updateInquiryMemo(id, adminMemo, adminViewer);
      if (!result) {
        throw notFound("Inquiry not found");
      }
      return result;
    },

    async updateInquiryStatus(inquiryId, body = {}, adminViewer) {
      const id = validateUuid(inquiryId, "inquiryId");
      const safeBody = rejectUnknownFields(body, ["status"]);
      const status = parseOptionalEnum(safeBody.status, INQUIRY_STATUSES, "status");
      if (!status) {
        throw validationError("status is required");
      }

      const result = await queries.updateInquiryStatus(id, status, adminViewer);
      if (!result) {
        throw notFound("Inquiry not found");
      }
      return result;
    }
  };
}
