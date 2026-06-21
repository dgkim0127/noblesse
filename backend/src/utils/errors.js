export class ApiError extends Error {
  constructor(statusCode, code, message, options = {}) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.expose = options.expose ?? true;
  }
}

export function unauthorized(message = "Authentication required") {
  return new ApiError(401, "UNAUTHORIZED", message);
}

export function forbidden(message = "Access denied") {
  return new ApiError(403, "FORBIDDEN", message);
}

export function notFound(message = "Resource not found") {
  return new ApiError(404, "NOT_FOUND", message);
}

export function conflict(message = "Request conflict") {
  return new ApiError(409, "CONFLICT", message);
}

export function payloadTooLarge(message = "Request payload too large") {
  return new ApiError(413, "PAYLOAD_TOO_LARGE", message);
}

export function unsupportedMediaType(message = "Unsupported media type") {
  return new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", message);
}

export function validationError(message = "Invalid request") {
  return new ApiError(400, "VALIDATION_ERROR", message);
}

export function internalError(message = "Internal server error") {
  return new ApiError(500, "INTERNAL_ERROR", message, { expose: false });
}
