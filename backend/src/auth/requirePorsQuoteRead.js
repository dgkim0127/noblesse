import crypto from "node:crypto";
import { unauthorized } from "../utils/errors.js";

const READ_TOKEN_HEADER = "x-pors-quote-read-token";

function matchesToken(expected, provided) {
  const expectedBuffer = Buffer.from(String(expected || ""), "utf8");
  const providedBuffer = Buffer.from(String(provided || ""), "utf8");
  if (!expectedBuffer.length || expectedBuffer.length !== providedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

export function createRequirePorsQuoteRead({ readToken }) {
  const expectedToken = String(readToken || "").trim();

  return function requirePorsQuoteRead(req, _res, next) {
    const providedToken = String(req.get(READ_TOKEN_HEADER) || "").trim();
    if (!matchesToken(expectedToken, providedToken)) {
      next(unauthorized("PORS quote read access required"));
      return;
    }

    req.porsQuoteViewer = {
      userId: "pors-readonly-device",
      authUid: "pors-readonly-device",
      role: "service",
      status: "approved",
      accountStatus: "active",
      permissions: ["quotes.read"],
      requestId: req.id
    };
    next();
  };
}
