import { ApiError } from "../utils/errors.js";

export function errorHandler(err, req, res, _next) {
  const isApiError = err instanceof ApiError;
  const statusCode = isApiError ? err.statusCode : 500;
  const code = isApiError ? err.code : "INTERNAL_ERROR";
  const message = isApiError && err.expose ? err.message : "Internal server error";

  if (!isApiError) {
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
