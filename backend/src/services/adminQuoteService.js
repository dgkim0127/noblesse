import crypto from "node:crypto";
import { conflict, internalError, notFound } from "../utils/errors.js";
import { createPaginationMeta, parsePagination, slicePageRows } from "../utils/pagination.js";
import {
  MARKETS,
  parseOptionalEnum,
  parseOptionalString,
  rejectUnknownFields,
  validationError,
  validateUuid
} from "../utils/validators.js";
import { createQuotePdfBuffer } from "./quotePdfRenderer.js";

const QUOTE_STATUSES = ["draft", "sent", "accepted", "rejected", "cancelled", "expired"];
const DOCUMENT_LOCALES = ["kr", "en", "jp", "zh-TW"];

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

function parseDate(value, fieldName) {
  const text = parseOptionalString(value, { maxLength: 10 });
  if (!text) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) {
    throw validationError(`Invalid ${fieldName}`);
  }
  return text;
}

function parsePositiveInteger(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1000000) {
    throw validationError(`Invalid ${fieldName}`);
  }
  return parsed;
}

function parseNonnegativeMoney(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1000000000000) {
    throw validationError(`Invalid ${fieldName}`);
  }
  return parsed;
}

function parseDraftBody(body = {}) {
  const safeBody = rejectUnknownFields(body, [
    "leadTime",
    "shippingNote",
    "validUntil",
    "documentLocale",
    "customerNote",
    "adminMemo",
    "items"
  ]);
  if (!Array.isArray(safeBody.items) || safeBody.items.length < 1 || safeBody.items.length > 100) {
    throw validationError("items must include 1 to 100 quote lines");
  }
  return {
    leadTime: parseOptionalString(safeBody.leadTime, { maxLength: 160 }) || "",
    shippingNote: parseOptionalString(safeBody.shippingNote, { maxLength: 1000 }) || "",
    validUntil: parseDate(safeBody.validUntil, "validUntil") || null,
    documentLocale: parseOptionalEnum(safeBody.documentLocale, DOCUMENT_LOCALES, "documentLocale") || "en",
    customerNote: parseOptionalString(safeBody.customerNote, { maxLength: 2000 }) || "",
    adminMemo: parseOptionalString(safeBody.adminMemo, { maxLength: 4000 }) || "",
    items: safeBody.items.map((rawItem) => {
      const item = rejectUnknownFields(rawItem || {}, ["id", "confirmedQuantity", "confirmedUnitPrice", "itemNote"]);
      return {
        id: validateUuid(item.id, "itemId"),
        confirmedQuantity: parsePositiveInteger(item.confirmedQuantity, "confirmedQuantity"),
        confirmedUnitPrice: parseNonnegativeMoney(item.confirmedUnitPrice, "confirmedUnitPrice"),
        itemNote: parseOptionalString(item.itemNote, { maxLength: 500 }) || ""
      };
    })
  };
}

function createQuoteNumber(quote) {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return quote.quoteNumber || `QT-${date}-${quote.id.slice(0, 8).toUpperCase()}`;
}

function createDocumentSnapshot(candidate) {
  const quote = candidate.quote;
  return {
    schemaVersion: 1,
    quoteId: quote.id,
    inquiryId: quote.inquiryId,
    inquiryNumber: quote.inquiryNumber,
    quoteNumber: createQuoteNumber(quote),
    revision: candidate.nextRevision,
    documentLocale: quote.documentLocale,
    currency: quote.currency,
    total: Number(quote.confirmedTotal || 0),
    issuedAt: new Date().toISOString(),
    validUntil: quote.validUntil,
    leadTime: quote.leadTime || "",
    shippingNote: quote.shippingNote || "",
    customerNote: quote.customerNote || "",
    buyer: {
      companyName: candidate.buyer?.companyName || "",
      country: candidate.buyer?.country || ""
    },
    items: (candidate.items || []).map((item) => ({
      id: item.id,
      productCode: item.productCode,
      productName: item.productName || item.productCode,
      color: item.color || "",
      size: item.size || "",
      quantity: Number(item.confirmedQuantity),
      unitPrice: Number(item.confirmedUnitPrice),
      subtotal: Number(item.confirmedSubtotal),
      itemNote: item.itemNote || ""
    }))
  };
}

async function cleanupObject(objectStore, objectKey) {
  try {
    await objectStore?.deleteMany?.([objectKey]);
  } catch {
    // Preserve the original issue failure.
  }
}

export function createAdminQuoteService({ queries, objectStore, pdfRenderer = createQuotePdfBuffer }) {
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
      if (!result) throw notFound("Quote not found");
      return result;
    },

    async createQuote(body = {}, adminViewer) {
      const safeBody = rejectUnknownFields(body, ["inquiryId", "leadTime", "shippingNote", "adminMemo"]);
      const inquiryId = validateUuid(safeBody.inquiryId, "inquiryId");
      const quoteInput = {
        leadTime: parseOptionalString(safeBody.leadTime, { maxLength: 160 }),
        shippingNote: parseOptionalString(safeBody.shippingNote, { maxLength: 1000 }),
        adminMemo: parseOptionalString(safeBody.adminMemo, { maxLength: 4000 })
      };
      const result = await queries.createQuoteFromInquiry(inquiryId, quoteInput, adminViewer);
      if (!result) throw notFound("Inquiry not found");
      if (result.conflictQuoteId) throw conflict("Quote already exists for this inquiry");
      return result;
    },

    async updateQuote(quoteId, body = {}, adminViewer) {
      const id = validateUuid(quoteId, "quoteId");
      const input = parseDraftBody(body);
      const result = await queries.updateQuoteDraft(id, input, adminViewer);
      if (!result) throw notFound("Quote not found");
      if (result.locked) throw conflict("Accepted, rejected, or cancelled quotes are locked");
      if (result.missingItems?.length) throw validationError("One or more quote lines do not belong to this quote");
      return result;
    },

    async issueQuote(quoteId, adminViewer) {
      const id = validateUuid(quoteId, "quoteId");
      if (!objectStore?.save || !objectStore?.deleteMany) {
        throw internalError("Quote document storage is not configured");
      }
      const candidate = await queries.getIssueCandidate(id, { adminViewer });
      if (!candidate) throw notFound("Quote not found");
      if (candidate.locked) throw conflict("Accepted, rejected, or cancelled quotes are locked");
      if (!candidate.quote.validUntil) throw validationError("validUntil is required before issue");
      if (candidate.items.length < 1 || candidate.items.some((item) => Number(item.confirmedQuantity) < 1 || Number(item.confirmedUnitPrice) < 0)) {
        throw validationError("Every quote line requires a valid quantity and unit price");
      }

      const snapshot = createDocumentSnapshot(candidate);
      const pdf = await pdfRenderer(snapshot);
      if (!Buffer.isBuffer(pdf) || pdf.length === 0) throw internalError("Quote PDF generation failed");
      const pdfSha256 = crypto.createHash("sha256").update(pdf).digest("hex");
      const objectKey = `quotes/${id}/revision-${snapshot.revision}-${crypto.randomUUID()}.pdf`;
      await objectStore.save({
        objectKey,
        buffer: pdf,
        contentType: "application/pdf",
        cacheControl: "private, max-age=0, no-store"
      });

      try {
        const result = await queries.issueQuote(id, {
          expectedUpdatedAt: candidate.quote.updatedAt,
          quoteNumber: snapshot.quoteNumber,
          snapshot,
          pdfObjectKey: objectKey,
          pdfSha256
        }, adminViewer);
        if (!result) throw notFound("Quote not found");
        if (result.locked) throw conflict("Quote is locked");
        if (result.stale) throw conflict("Quote changed while the document was being issued");
        return result;
      } catch (error) {
        await cleanupObject(objectStore, objectKey);
        throw error;
      }
    },

    async getQuoteDocument(quoteId, documentId, adminViewer) {
      const id = validateUuid(quoteId, "quoteId");
      const docId = validateUuid(documentId, "documentId");
      const document = await queries.getDocumentAccess(id, docId, { adminViewer });
      if (!document) throw notFound("Quote document not found");
      if (!objectStore || typeof objectStore.createReadStream !== "function") {
        throw internalError("Quote document storage is not configured");
      }
      return {
        stream: await objectStore.createReadStream(document.pdfObjectKey),
        filename: `${document.quoteNumber || "quotation"}-v${document.revision}.pdf`
      };
    },

    async updateQuoteStatus(quoteId, body = {}, adminViewer) {
      const id = validateUuid(quoteId, "quoteId");
      const safeBody = rejectUnknownFields(body, ["status"]);
      const status = parseOptionalEnum(safeBody.status, ["draft", "cancelled"], "status");
      if (!status) throw validationError("Only draft or cancelled can be set directly; issue or buyer decision controls other statuses");
      const result = await queries.updateQuoteStatus(id, status, adminViewer);
      if (!result) throw notFound("Quote not found");
      if (result.locked) throw conflict("Accepted or rejected quotes are locked");
      return result;
    }
  };
}
