import { ADMIN_ROLES, PERMISSIONS } from "../auth/adminPermissions.js";
import { conflict, notFound, validationError } from "../utils/errors.js";
import { parseRequiredString, rejectUnknownFields, validateUuid } from "../utils/validators.js";

function parseAdminRole(value) {
  if (!ADMIN_ROLES.includes(value)) {
    throw validationError("Invalid adminRole");
  }
  return value;
}

function parseOverride(input = {}) {
  const safe = rejectUnknownFields(input, ["permissionKey", "effect", "reason", "expiresAt"]);
  if (!PERMISSIONS.includes(safe.permissionKey)) {
    throw validationError("Invalid permissionKey");
  }
  if (!["allow", "deny"].includes(safe.effect)) {
    throw validationError("Invalid override effect");
  }
  if (safe.reason === undefined || safe.reason === null) {
    throw validationError("reason is required");
  }
  const reason = parseRequiredString(safe.reason, { fieldName: "reason", maxLength: 240 });
  let expiresAt = null;
  if (safe.expiresAt !== undefined && safe.expiresAt !== null && safe.expiresAt !== "") {
    if (typeof safe.expiresAt !== "string") {
      throw validationError("expiresAt must be an ISO timestamp");
    }
    const parsed = new Date(safe.expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      throw validationError("expiresAt must be a valid ISO timestamp");
    }
    if (parsed.getTime() <= Date.now()) {
      throw validationError("expiresAt must be in the future");
    }
    expiresAt = safe.expiresAt;
  }
  return {
    permissionKey: safe.permissionKey,
    effect: safe.effect,
    reason,
    expiresAt
  };
}

export function createAdminAccessService({ queries }) {
  return {
    async getCurrentAdmin(adminViewer) {
      return {
        userId: adminViewer.userId,
        email: adminViewer.email,
        role: adminViewer.role,
        status: adminViewer.status,
        accountStatus: adminViewer.accountStatus,
        adminRole: adminViewer.adminRole,
        permissions: adminViewer.permissions || [],
        deniedPermissions: adminViewer.deniedPermissions || []
      };
    },

    async listAdmins() {
      return { admins: await queries.listAdmins() };
    },

    async updateAdminRole(userId, body = {}, adminViewer) {
      const id = validateUuid(userId, "userId");
      const safe = rejectUnknownFields(body, ["adminRole"]);
      const adminRole = parseAdminRole(safe.adminRole);
      const result = await queries.updateAdminRole(id, adminRole, adminViewer);
      if (!result) throw notFound("Admin user not found");
      if (result.lastOwner) throw conflict("At least one owner admin is required");
      return result;
    },

    async replacePermissionOverrides(userId, body = {}, adminViewer) {
      const id = validateUuid(userId, "userId");
      const safe = rejectUnknownFields(body, ["overrides"]);
      if (!Array.isArray(safe.overrides)) {
        throw validationError("overrides must be an array");
      }
      const overrides = safe.overrides.map(parseOverride);
      const uniqueKeys = new Set(overrides.map((override) => override.permissionKey));
      if (uniqueKeys.size !== overrides.length) {
        throw validationError("Duplicate permissionKey override");
      }
      const result = await queries.replacePermissionOverrides(id, overrides, adminViewer);
      if (!result) throw notFound("Admin user not found");
      if (result.ownerOverrideBlocked) throw validationError("Owner permissions cannot be overridden");
      return result;
    },

    async deletePermissionOverride(userId, permissionKey, adminViewer) {
      const id = validateUuid(userId, "userId");
      if (!PERMISSIONS.includes(permissionKey)) {
        throw validationError("Invalid permissionKey");
      }
      const result = await queries.deletePermissionOverride(id, permissionKey, adminViewer);
      if (!result) throw notFound("Permission override not found");
      return result;
    },

    async listAuditEntries(filters = {}) {
      const limit = Math.min(Math.max(Number(filters.limit || 50), 1), 100);
      const offset = Math.max(Number(filters.offset || 0), 0);
      const action = typeof filters.action === "string" && filters.action.trim()
        ? filters.action.trim()
        : null;
      const q = typeof filters.q === "string" && filters.q.trim()
        ? filters.q.trim()
        : null;
      return {
        auditLogs: await queries.listAuditEntries({ limit, offset, action, q }),
        meta: { limit, offset }
      };
    }
  };
}
