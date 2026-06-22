import { unauthorized } from "../utils/errors.js";
import { deriveLegacyBuyerStatus, normalizeAccountStatus, normalizeVerificationStatus } from "./buyerLifecycle.js";

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
    const accountStatus = normalizeAccountStatus(user.account_status, user.status);
    const verificationStatus = buyer
      ? normalizeVerificationStatus(buyer.verification_status, user.status)
      : null;
    const status = user.role === "buyer"
      ? deriveLegacyBuyerStatus({ accountStatus, verificationStatus })
      : user.status;

    return {
      userId: user.id,
      authUid: user.auth_uid,
      email: user.email || decodedToken.email,
      role: user.role,
      status,
      legacyStatus: user.status,
      accountStatus,
      verificationStatus,
      buyerId: buyer?.id || null,
      companyName: buyer?.company_name || null,
      contactName: buyer?.contact_name || null,
      country: buyer?.country || null,
      preferredLanguage: buyer?.preferred_language || null,
      submittedAt: buyer?.submitted_at || null,
      reviewedAt: buyer?.reviewed_at || null,
      rejectionReason: buyer?.rejection_reason || null,
      suspensionReason: buyer?.suspension_reason || null,
      assignedMarket: buyer?.assigned_market || null,
      currency: buyer?.currency || null,
      discountRate: buyer?.discount_rate || 0,
      minOrderAmount: buyer?.min_order_amount || 0
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

export function createRequireFirebaseIdentity({ verifier }) {
  return async function requireFirebaseIdentity(req, _res, next) {
    try {
      const token = readBearerToken(req);
      if (!token) {
        throw unauthorized();
      }

      const decoded = await verifier.verifyIdToken(token);
      req.firebaseIdentity = {
        authUid: decoded.uid,
        email: decoded.email || null
      };
      next();
    } catch (error) {
      next(error.code ? error : unauthorized("Invalid authentication token"));
    }
  };
}
