import { unauthorized } from "../utils/errors.js";

function readBearerToken(req) {
  const header = req.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

export function createPostgresViewerLoader({ pool, queries }) {
  return async function loadViewer(decodedToken) {
    const user = await queries.getUserByAuthUid(pool, decodedToken.uid);
    if (!user) return null;

    const buyer = user.role === "buyer" ? await queries.getBuyerByUserId(pool, user.id) : null;

    return {
      userId: user.id,
      authUid: user.auth_uid,
      email: user.email || decodedToken.email,
      role: user.role,
      status: user.status,
      buyerId: buyer?.id || null,
      companyName: buyer?.company_name || null,
      assignedMarket: buyer?.assigned_market || null,
      currency: buyer?.currency || null
    };
  };
}

export function createRequireUser({ verifier, loadViewer }) {
  return async function requireUser(req, _res, next) {
    try {
      const token = readBearerToken(req);
      if (!token) {
        throw unauthorized();
      }

      const decoded = await verifier.verifyIdToken(token);
      const viewer = loadViewer
        ? await loadViewer(decoded)
        : {
            authUid: decoded.uid,
            email: decoded.email,
            role: "buyer",
            status: "pending"
          };

      if (!viewer) {
        throw unauthorized("User profile not found");
      }

      // Firebase identity alone never grants admin or approved-buyer access.
      // PostgreSQL users/buyers status remains the business authorization source.
      req.viewer = {
        ...viewer,
        authUid: viewer.authUid || decoded.uid,
        email: viewer.email || decoded.email
      };
      next();
    } catch (error) {
      next(error.code ? error : unauthorized("Invalid authentication token"));
    }
  };
}
