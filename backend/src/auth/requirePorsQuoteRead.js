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

export function createRequirePorsQuoteRead({ readToken, writeToken }) {
  const expectedToken = String(readToken || "").trim();
  const expectedWriteToken = String(writeToken || "").trim();

  return function requirePorsQuoteRead(req, _res, next) {
    const providedToken = String(req.get(READ_TOKEN_HEADER) || "").trim();
    const usesWriteToken = matchesToken(expectedWriteToken, providedToken);
    if (!matchesToken(expectedToken, providedToken) && !usesWriteToken) {
      next(unauthorized("PORS quote read access required"));
      return;
    }

    req.porsQuoteViewer = {
      userId: usesWriteToken ? "pors-managed-device" : "pors-readonly-device",
      authUid: usesWriteToken ? "pors-managed-device" : "pors-readonly-device",
      role: "service",
      status: "approved",
      accountStatus: "active",
      permissions: ["quotes.read"],
      requestId: req.id
    };
    next();
  };
}
