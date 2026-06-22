import { forbidden, internalError, unauthorized } from "../utils/errors.js";
import { resolveAdminPermissions } from "./adminPermissions.js";

function readBearerToken(req) {
  const header = req.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

export function createRequireAdmin({ verifier, loadAdminUserByAuthUid }) {
  return async function requireAdmin(req, _res, next) {
    try {
      const token = readBearerToken(req);
      if (!token) {
        throw unauthorized();
      }

      let decoded;
      try {
        decoded = await verifier.verifyIdToken(token);
      } catch (_error) {
        throw unauthorized("Invalid authentication token");
      }

      const user = await loadAdminUserByAuthUid(decoded.uid);
      if (!user) {
        throw forbidden("Admin access required");
      }
      if (user.role !== "admin") {
        throw forbidden("Admin access required");
      }
      const accountStatus =
        user.accountStatus || user.account_status || (user.status === "blocked" ? "blocked" : "active");
      if (user.status !== "approved") {
        throw forbidden("Approved admin access required");
      }
      if (accountStatus !== "active") {
        throw forbidden("Active admin account required");
      }

      const resolvedPermissions = resolveAdminPermissions({
        adminRole: user.adminRole || user.admin_role || "owner",
        overrides: user.permissionOverrides || user.permission_overrides || []
      });

      // Frontend viewerState never grants admin access. The backend must load
      // PostgreSQL user role/status before attaching the admin context.
      const adminViewer = {
        userId: user.userId || user.id,
        authUid: user.authUid || user.auth_uid || decoded.uid,
        email: user.email || decoded.email || null,
        role: user.role,
        status: user.status,
        accountStatus,
        adminRole: resolvedPermissions.adminRole,
        permissions: resolvedPermissions.permissions,
        deniedPermissions: resolvedPermissions.deniedPermissions,
        requestId: req.id
      };

      req.adminViewer = adminViewer;
      req.viewer = adminViewer;
      next();
    } catch (error) {
      if (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN") {
        next(error);
        return;
      }
      next(internalError("Admin authentication failed"));
    }
  };
}
