import crypto from "node:crypto";
import { unauthorized } from "../utils/errors.js";

const WRITE_TOKEN_HEADER = "x-pors-quote-write-token";

function matchesToken(expected, provided) {
  const expectedBuffer = Buffer.from(String(expected || ""), "utf8");
  const providedBuffer = Buffer.from(String(provided || ""), "utf8");
  if (!expectedBuffer.length || expectedBuffer.length !== providedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

export function createRequirePorsQuoteWrite({ writeToken }) {
  const expectedToken = String(writeToken || "").trim();

  return function requirePorsQuoteWrite(req, _res, next) {
    const providedToken = String(req.get(WRITE_TOKEN_HEADER) || "").trim();
    if (!matchesToken(expectedToken, providedToken)) {
      next(unauthorized("PORS quote device write access required"));
      return;
    }

    req.porsQuoteViewer = {
      userId: null,
      authUid: "pors-managed-device",
      role: "service",
      status: "approved",
      accountStatus: "active",
      permissions: ["quotes.read", "quotes.write"],
      requestId: req.id
    };
    next();
  };
}
