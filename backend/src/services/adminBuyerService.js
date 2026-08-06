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
import { forbidden, notFound } from "../utils/errors.js";

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

function canDeleteBuyers(adminViewer) {
  return adminViewer?.adminRole === "owner" &&
    Array.isArray(adminViewer?.permissions) &&
    adminViewer.permissions.includes("admins.manage");
}

export function createAdminBuyerService({ queries, identityManager = null, objectStore = null }) {
  return {
    async listBuyers(filters = {}, adminViewer) {
      const parsed = parseBuyerFilters(filters);
      const buyers = await queries.listBuyers(parsed, { adminViewer });
      const statusCounts = queries.countBuyersByStatus
        ? await queries.countBuyersByStatus(parsed, { adminViewer })
        : null;
      const safeBuyers = canReadSensitive(adminViewer) ? buyers : buyers.map(maskSensitiveBuyerFields);
      const meta = createPaginationMeta(parsed, undefined, buyers.length);
      if (statusCounts) {
        meta.statusCounts = statusCounts;
      }
      return {
        buyers: slicePageRows(safeBuyers, parsed),
        meta
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
    },

    async deleteBuyer(buyerId, body = {}, adminViewer) {
      if (!canDeleteBuyers(adminViewer)) {
        throw forbidden("Only the owner administrator can delete buyer accounts");
      }
      const id = validateUuid(buyerId, "buyerId");
      const safeBody = rejectUnknownFields(body, ["confirmation"]);
      const confirmation = parseOptionalString(safeBody.confirmation, { maxLength: 254 });
      if (!confirmation) {
        throw validationError("confirmation is required");
      }

      const candidate = await queries.getBuyerDeletionCandidate(id, { adminViewer });
      if (!candidate) {
        throw notFound("Buyer not found");
      }
      if (String(candidate.email || "").toLowerCase() !== confirmation.toLowerCase()) {
        throw validationError("confirmation must match the buyer email");
      }
      if (!candidate.authUid || !identityManager?.deleteUser) {
        throw validationError("Buyer login identity cannot be deleted");
      }

      await identityManager.deleteUser(candidate.authUid);
      const result = await queries.deleteBuyer(id, adminViewer);
      if (!result) {
        throw notFound("Buyer not found");
      }

      if (result.pdfObjectKeys?.length && objectStore?.deleteMany) {
        await objectStore.deleteMany(result.pdfObjectKeys);
      }

      return {
        deleted: {
          buyerId: result.buyerId,
          email: result.email,
          inquiryCount: result.inquiryCount,
          quoteDocumentCount: result.pdfObjectKeys?.length || 0,
          authAccountDeleted: true
        },
        auditLogId: result.auditLogId
      };
    }
  };
}
