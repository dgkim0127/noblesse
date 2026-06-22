import { ADMIN_ROLES, PERMISSIONS } from "../auth/adminPermissions.js";
import { conflict, notFound, validationError } from "../utils/errors.js";
import { parseOptionalString, rejectUnknownFields, validateUuid } from "../utils/validators.js";

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
  return {
    permissionKey: safe.permissionKey,
    effect: safe.effect,
    reason: parseOptionalString(safe.reason, { maxLength: 240 }),
    expiresAt: parseOptionalString(safe.expiresAt, { maxLength: 40 })
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
      return {
        auditLogs: await queries.listAuditEntries({ limit, offset }),
        meta: { limit, offset }
      };
    }
  };
}
