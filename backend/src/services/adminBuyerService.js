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

const BUYER_VERIFICATION_STATUSES = ["draft", "pending", "approved", "rejected", "suspended"];
const ACCOUNT_STATUSES = ["active", "blocked"];
const legacyStatusMap = {
  pending: "pending",
  approved: "approved",
  blocked: "suspended"
};

function canReadSensitive(adminViewer) {
  return Array.isArray(adminViewer?.permissions) && adminViewer.permissions.includes("buyers.sensitive.read");
}

function maskSensitiveBuyerFields(buyer) {
  if (!buyer) return buyer;
  return {
    ...buyer,
    phone: buyer.phone ? "MASKED" : buyer.phone,
    messengerId: buyer.messengerId ? "MASKED" : buyer.messengerId,
    businessNumber: buyer.businessNumber ? "MASKED" : buyer.businessNumber
  };
}

function parseBuyerFilters(filters) {
  const pagination = parsePagination(filters);
  return {
    status: parseOptionalEnum(filters.status, USER_STATUSES, "status"),
    verificationStatus: parseOptionalEnum(filters.verificationStatus, BUYER_VERIFICATION_STATUSES, "verificationStatus"),
    accountStatus: parseOptionalEnum(filters.accountStatus, ACCOUNT_STATUSES, "accountStatus"),
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
      const safeBuyers = canReadSensitive(adminViewer) ? buyers : buyers.map(maskSensitiveBuyerFields);
      return {
        buyers: slicePageRows(safeBuyers, parsed),
        meta: createPaginationMeta(parsed, undefined, buyers.length)
      };
    },

    async getBuyerById(buyerId, adminViewer) {
      const id = validateUuid(buyerId, "buyerId");
      const result = await queries.getBuyerById(id, { adminViewer });
      if (!result) {
        throw notFound("Buyer not found");
      }
      if (!canReadSensitive(adminViewer)) {
        return { ...result, buyer: maskSensitiveBuyerFields(result.buyer) };
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

      const result = queries.updateBuyerVerificationStatus
        ? await queries.updateBuyerVerificationStatus(
          id,
          { verificationStatus: legacyStatusMap[status] || status },
          adminViewer
        )
        : await queries.updateBuyerStatus(id, status, adminViewer);
      if (!result) {
        throw notFound("Buyer not found");
      }
      return result;
    },

    async updateBuyerVerification(buyerId, body = {}, adminViewer) {
      const id = validateUuid(buyerId, "buyerId");
      const safeBody = rejectUnknownFields(body, ["verificationStatus", "reason", "assignedAdminId", "internalMemo"]);
      const verificationStatus = parseOptionalEnum(
        safeBody.verificationStatus,
        BUYER_VERIFICATION_STATUSES,
        "verificationStatus"
      );
      if (!verificationStatus) {
        throw validationError("verificationStatus is required");
      }
      if (["rejected", "suspended"].includes(verificationStatus) && !safeBody.reason) {
        throw validationError("reason is required");
      }
      const result = await queries.updateBuyerVerificationStatus(
        id,
        {
          verificationStatus,
          reason: parseOptionalString(safeBody.reason, { maxLength: 500 }),
          assignedAdminId: parseOptionalString(safeBody.assignedAdminId, { maxLength: 36 }),
          internalMemo: parseOptionalString(safeBody.internalMemo, { maxLength: 2000 })
        },
        adminViewer
      );
      if (!result) {
        throw notFound("Buyer not found");
      }
      return result;
    },

    async updateBuyerAccountStatus(buyerId, body = {}, adminViewer) {
      const id = validateUuid(buyerId, "buyerId");
      const safeBody = rejectUnknownFields(body, ["accountStatus", "reason"]);
      const accountStatus = parseOptionalEnum(safeBody.accountStatus, ACCOUNT_STATUSES, "accountStatus");
      if (!accountStatus) {
        throw validationError("accountStatus is required");
      }
      if (accountStatus === "blocked" && !safeBody.reason) {
        throw validationError("reason is required");
      }
      const result = await queries.updateBuyerAccountStatus(
        id,
        {
          accountStatus,
          reason: parseOptionalString(safeBody.reason, { maxLength: 500 })
        },
        adminViewer
      );
      if (!result) {
        throw notFound("Buyer not found");
      }
      return result;
    }
  };
}
