import { ApiError } from "../utils/errors.js";

export function errorHandler(err, req, res, _next) {
  const bodyParserPayloadTooLarge = err?.type === "entity.too.large" || err?.status === 413;
  const isApiError = err instanceof ApiError;
  const statusCode = bodyParserPayloadTooLarge ? 413 : isApiError ? err.statusCode : 500;
  const code = bodyParserPayloadTooLarge ? "PAYLOAD_TOO_LARGE" : isApiError ? err.code : "INTERNAL_ERROR";
  const message = bodyParserPayloadTooLarge
    ? "Request payload too large"
    : isApiError && err.expose
      ? err.message
      : "Internal server error";

  if (!isApiError && !bodyParserPayloadTooLarge) {
    console.error("Unhandled backend error", {
      requestId: req.id,
      message: err?.message
    });
  }

  res.status(statusCode).json({
    error: {
      code,
      message,
      requestId: req.id
    }
  });
}
