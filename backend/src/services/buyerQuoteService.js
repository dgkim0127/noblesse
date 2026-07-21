import { isQuoteEnabledBuyerLifecycle } from "../auth/buyerLifecycle.js";
import { conflict, forbidden, internalError, notFound, validationError } from "../utils/errors.js";
import { parseOptionalEnum, parseOptionalString, rejectUnknownFields, validateUuid } from "../utils/validators.js";

function requireQuoteEnabledBuyer(viewer) {
  if (!isQuoteEnabledBuyerLifecycle(viewer)) throw forbidden("Active buyer account required");
  return viewer;
}

export function createBuyerQuoteService({ queries, objectStore }) {
  return {
    async getQuoteForInquiry(inquiryId, viewer) {
      const buyer = requireQuoteEnabledBuyer(viewer);
      const id = validateUuid(inquiryId, "inquiryId");
      return queries.getQuoteForInquiry(buyer, id);
    },

    async getQuoteDocument(quoteId, documentId, viewer) {
      const buyer = requireQuoteEnabledBuyer(viewer);
      const id = validateUuid(quoteId, "quoteId");
      const docId = validateUuid(documentId, "documentId");
      const document = await queries.getDocumentAccess(buyer, id, docId);
      if (!document) throw notFound("Quote document not found");
      if (!objectStore || typeof objectStore.createReadStream !== "function") {
        throw internalError("Quote document storage is not configured");
      }
      return {
        stream: await objectStore.createReadStream(document.pdfObjectKey),
        filename: `${document.quoteNumber || "quotation"}-v${document.revision}.pdf`
      };
    },

    async decideQuote(quoteId, body = {}, viewer) {
      const buyer = requireQuoteEnabledBuyer(viewer);
      const id = validateUuid(quoteId, "quoteId");
      const safeBody = rejectUnknownFields(body, ["documentId", "decision", "note"]);
      const input = {
        documentId: validateUuid(safeBody.documentId, "documentId"),
        decision: parseOptionalEnum(safeBody.decision, ["accepted", "rejected"], "decision"),
        note: parseOptionalString(safeBody.note, { maxLength: 1000 }) || ""
      };
      if (!input.decision) throw validationError("A quote decision is required");
      const result = await queries.decideQuote(buyer, id, input);
      if (!result) throw notFound("Quote not found");
      if (result.decisionDisabled) throw conflict("Buyer quote decisions are not used for this fulfillment workflow");
      if (result.stale) throw conflict("This quote document is no longer current");
      if (result.expired) throw conflict("This quote has expired");
      if (result.locked) throw conflict("This quote has already been decided or cancelled");
      return result;
    }
  };
}
