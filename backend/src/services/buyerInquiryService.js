import { forbidden, notFound } from "../utils/errors.js";
import { isApprovedBuyerLifecycle } from "../auth/buyerLifecycle.js";
import { createPaginationMeta, parsePagination, slicePageRows } from "../utils/pagination.js";
import {
  INQUIRY_STATUSES,
  parseOptionalEnum,
  parseOptionalString,
  rejectUnknownFields,
  validateUuid,
  validationError
} from "../utils/validators.js";

const productCodePattern = /^[A-Z0-9][A-Z0-9-]{1,39}$/i;
const optionIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

function requireApprovedBuyer(viewer) {
  if (!isApprovedBuyerLifecycle(viewer)) {
    throw forbidden("Approved buyer access required");
  }
  return viewer;
}

function parsePositiveInteger(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 100000) {
    throw validationError(`Invalid ${fieldName}`);
  }
  return parsed;
}

function parseProductCode(value) {
  if (typeof value !== "string" || !productCodePattern.test(value.trim())) {
    throw validationError("Invalid productCode");
  }
  return value.trim().toUpperCase();
}

function parseSelectedOptions(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 6) {
    throw validationError("selectedOptions must contain at most 6 values");
  }
  const groups = new Set();
  return value.map((raw, index) => {
    const item = rejectUnknownFields(raw || {}, ["groupId", "valueId"]);
    const groupId = parseOptionalString(item.groupId, { maxLength: 64 });
    const valueId = parseOptionalString(item.valueId, { maxLength: 64 });
    if (!optionIdPattern.test(groupId || "") || !optionIdPattern.test(valueId || "")) {
      throw validationError(`Invalid selectedOptions[${index}]`);
    }
    if (groups.has(groupId)) throw validationError(`Duplicate selected option group: ${groupId}`);
    groups.add(groupId);
    return { groupId, valueId };
  });
}

function parseInquiryFilters(filters) {
  const pagination = parsePagination(filters);
  return {
    status: parseOptionalEnum(filters.status, INQUIRY_STATUSES, "status"),
    limit: pagination.limit,
    offset: pagination.offset,
    dbLimit: pagination.dbLimit,
    nextCursor: pagination.nextCursor
  };
}

function parseCreateInquiryBody(body = {}) {
  const safeBody = rejectUnknownFields(body, ["items", "requestMemo"]);
  if (!Array.isArray(safeBody.items) || safeBody.items.length === 0 || safeBody.items.length > 50) {
    throw validationError("items must include 1 to 50 products");
  }

  return {
    requestMemo: parseOptionalString(safeBody.requestMemo, { maxLength: 2000 }) || "",
    items: safeBody.items.map((rawItem) => {
      const item = rejectUnknownFields(rawItem, ["productCode", "color", "size", "selectedOptions", "quantity"]);
      return {
        productCode: parseProductCode(item.productCode),
        color: parseOptionalString(item.color, { maxLength: 80 }) || "",
        size: parseOptionalString(item.size, { maxLength: 80 }) || "",
        selectedOptions: parseSelectedOptions(item.selectedOptions),
        quantity: parsePositiveInteger(item.quantity, "quantity")
      };
    })
  };
}

export function createBuyerInquiryService({ queries }) {
  return {
    async listProductPrices(viewer) {
      const priceBookViewer = requireApprovedBuyer(viewer);
      return queries.listProductPrices(priceBookViewer);
    },

    async listInquiries(filters = {}, viewer) {
      const buyer = requireApprovedBuyer(viewer);
      const parsed = parseInquiryFilters(filters);
      const inquiries = await queries.listInquiries(buyer, parsed);
      return {
        inquiries: slicePageRows(inquiries, parsed),
        meta: createPaginationMeta(parsed, undefined, inquiries.length)
      };
    },

    async getInquiryById(inquiryId, viewer) {
      const buyer = requireApprovedBuyer(viewer);
      const id = validateUuid(inquiryId, "inquiryId");
      const inquiry = await queries.getInquiryById(buyer, id);
      if (!inquiry) {
        throw notFound("Inquiry not found");
      }
      return inquiry;
    },

    async createInquiry(body = {}, viewer) {
      const buyer = requireApprovedBuyer(viewer);
      const parsed = parseCreateInquiryBody(body);
      const inquiry = await queries.createInquiry(buyer, parsed);
      if (!inquiry) {
        throw notFound("Product price not available");
      }
      return inquiry;
    }
  };
}
