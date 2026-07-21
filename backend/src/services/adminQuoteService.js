import crypto from "node:crypto";
import sharp from "sharp";
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
const WORKFLOW_STATUSES = ["received", "picking", "receipt_sent", "payment_confirmed", "shipped", "completed", "cancelled"];
const FULFILLMENT_STATUSES = ["pending", "ready", "partial", "cancelled"];
const CANCELLATION_REASONS = ["out_of_stock", "quantity_shortage", "quality_issue", "discontinued", "other"];
const DOCUMENT_LOCALES = ["kr", "en", "jp", "zh-TW"];
const MAX_PICKING_IMAGE_BYTES = 5 * 1024 * 1024;

function parseQuoteFilters(filters) {
  const pagination = parsePagination(filters);
  return {
    status: parseOptionalEnum(filters.status, QUOTE_STATUSES, "status"),
    workflowStatus: parseOptionalEnum(filters.workflowStatus, WORKFLOW_STATUSES, "workflowStatus"),
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

function parseNonnegativeInteger(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 1000000) {
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
      const item = rejectUnknownFields(rawItem || {}, [
        "id",
        "confirmedQuantity",
        "confirmedUnitPrice",
        "itemNote",
        "fulfillmentStatus",
        "cancellationReason",
        "cancellationNote"
      ]);
      return {
        id: validateUuid(item.id, "itemId"),
        confirmedQuantity: parseNonnegativeInteger(item.confirmedQuantity, "confirmedQuantity"),
        confirmedUnitPrice: parseNonnegativeMoney(item.confirmedUnitPrice, "confirmedUnitPrice"),
        itemNote: parseOptionalString(item.itemNote, { maxLength: 500 }) || "",
        fulfillmentStatus: parseOptionalEnum(item.fulfillmentStatus, FULFILLMENT_STATUSES, "fulfillmentStatus"),
        cancellationReason: parseOptionalEnum(item.cancellationReason, CANCELLATION_REASONS, "cancellationReason"),
        cancellationNote: parseOptionalString(item.cancellationNote, { maxLength: 500 }) || ""
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
    schemaVersion: 3,
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
      productImage: item.productImage ? {
        id: item.productImage.id || "",
        url: item.productImage.url || "",
        altText: item.productImage.altText || ""
      } : null,
      color: item.color || "",
      size: item.size || "",
      selectedOptions: Array.isArray(item.selectedOptions) ? item.selectedOptions : [],
      requestedQuantity: Number(item.requestedQuantity),
      quantity: Number(item.confirmedQuantity),
      cancelledQuantity: Number(item.cancelledQuantity || 0),
      fulfillmentStatus: item.fulfillmentStatus || "ready",
      cancellationReason: item.cancellationReason || "",
      cancellationNote: item.cancellationNote || "",
      unitPrice: Number(item.confirmedUnitPrice),
      subtotal: Number(item.confirmedSubtotal),
      itemNote: item.itemNote || ""
    }))
  };
}

async function readObjectBuffer(objectStore, objectKey) {
  if (!objectKey || typeof objectStore?.createReadStream !== "function") return null;
  const stream = await objectStore.createReadStream(objectKey);
  if (Buffer.isBuffer(stream)) return stream.length <= MAX_PICKING_IMAGE_BYTES ? stream : null;

  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > MAX_PICKING_IMAGE_BYTES) return null;
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

async function createPickingThumbnail(objectStore, objectKey) {
  try {
    const source = await readObjectBuffer(objectStore, objectKey);
    if (!source?.length) return null;
    return await sharp(source, { failOn: "error" })
      .rotate()
      .resize({ width: 180, height: 180, fit: "contain", background: "#ffffff" })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 84 })
      .toBuffer();
  } catch {
    return null;
  }
}

function decodeCatalogMediaObjectKey(url) {
  const match = String(url || "").match(/(?:^|\/)api\/catalog\/media\/([^/?#]+)/);
  if (!match) return "";

  try {
    const objectKey = Buffer.from(decodeURIComponent(match[1]), "base64url").toString("utf8");
    return objectKey.startsWith("products/") ? objectKey : "";
  } catch {
    return "";
  }
}

async function createPdfRenderSnapshot(snapshot, candidateItems, objectStore) {
  const sourceById = new Map((candidateItems || []).map((item) => [item.id, item.productImage]));
  const imageCache = new Map();
  const items = [];

  for (const item of snapshot.items || []) {
    const productImage = sourceById.get(item.id);
    const objectKey = productImage?.objectKey || decodeCatalogMediaObjectKey(productImage?.url);
    let imageBuffer = null;
    if (objectKey) {
      if (!imageCache.has(objectKey)) {
        imageCache.set(objectKey, await createPickingThumbnail(objectStore, objectKey));
      }
      imageBuffer = imageCache.get(objectKey);
    }
    items.push({ ...item, imageBuffer });
  }

  return { ...snapshot, items };
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
      if (result.locked) throw conflict("This quote can no longer be edited in its current workflow state");
      if (result.missingItems?.length) throw validationError("One or more quote lines do not belong to this quote");
      if (result.invalidItems?.length) throw validationError(result.invalidItems[0].message || "One or more quote lines are invalid");
      return result;
    },

    async issueQuote(quoteId, adminViewer) {
      const id = validateUuid(quoteId, "quoteId");
      if (!objectStore?.save || !objectStore?.deleteMany) {
        throw internalError("Quote document storage is not configured");
      }
      const candidate = await queries.getIssueCandidate(id, { adminViewer });
      if (!candidate) throw notFound("Quote not found");
      if (candidate.locked) throw conflict("This quote cannot be issued in its current workflow state");
      if (!candidate.quote.validUntil) throw validationError("validUntil is required before issue");
      if (candidate.items.length < 1 || candidate.items.some((item) => item.fulfillmentStatus === "pending")) {
        throw validationError("Every quote line must be marked ready, partial, or cancelled before issue");
      }
      if (!candidate.items.some((item) => Number(item.confirmedQuantity) > 0)) {
        throw validationError("At least one quote line must be prepared before issue");
      }
      if (candidate.items.some((item) => Number(item.confirmedQuantity) < 0 || Number(item.confirmedUnitPrice) < 0)) {
        throw validationError("Every prepared quote line requires a valid quantity and unit price");
      }

      const snapshot = createDocumentSnapshot(candidate);
      const renderSnapshot = await createPdfRenderSnapshot(snapshot, candidate.items, objectStore);
      const pdf = await pdfRenderer(renderSnapshot);
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
      if (!status) throw validationError("Only draft or cancelled can be set directly; issuing and fulfillment controls other statuses");
      const result = await queries.updateQuoteStatus(id, status, adminViewer);
      if (!result) throw notFound("Quote not found");
      if (result.locked) throw conflict("Accepted or rejected quotes are locked");
      return result;
    },

    async updateWorkflowStatus(quoteId, body = {}, adminViewer) {
      const id = validateUuid(quoteId, "quoteId");
      const safeBody = rejectUnknownFields(body, ["status", "note"]);
      const status = parseOptionalEnum(safeBody.status, WORKFLOW_STATUSES, "status");
      const note = parseOptionalString(safeBody.note, { maxLength: 1000 }) || "";
      if (!status) throw validationError("A workflow status is required");
      if (status === "cancelled" && !note) throw validationError("A cancellation reason is required");
      const result = await queries.updateWorkflowStatus(id, { status, note }, adminViewer);
      if (!result) throw notFound("Quote not found");
      if (result.invalidTransition) throw conflict(`Workflow cannot move from ${result.fromStatus} to ${status}`);
      if (result.unresolvedItems) throw conflict("Resolve every line as ready, partial, or cancelled before completing picking");
      if (result.documentRequired) throw conflict("Issue the prepared-items PDF before completing picking");
      if (result.noPreparedItems) throw conflict("At least one item must be prepared before continuing");
      return result;
    }
  };
}
