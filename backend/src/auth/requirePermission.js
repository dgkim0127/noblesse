import { forbidden } from "../utils/errors.js";
import { hasAdminPermission } from "./adminPermissions.js";

export function createRequirePermission(permissionKey) {
  return function requirePermission(req, _res, next) {
    if (!hasAdminPermission(req.adminViewer, permissionKey)) {
      next(forbidden("Admin permission required"));
      return;
    }
    next();
  };
}
