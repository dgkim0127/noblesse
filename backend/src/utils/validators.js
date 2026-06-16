import { validationError as createValidationError } from "./errors.js";

export const INQUIRY_STATUSES = ["requested", "checking", "quoted", "confirmed", "cancelled"];
export const USER_STATUSES = ["pending", "approved", "blocked"];
export const MARKETS = ["KR", "JP", "US", "GLOBAL"];

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validationError(message) {
  return createValidationError(message);
}

export function isUuid(value) {
  return typeof value === "string" && uuidPattern.test(value);
}

export function validateUuid(value, fieldName = "id") {
  if (!isUuid(value)) {
    throw validationError(`Invalid ${fieldName}`);
  }
  return value;
}

export function parseOptionalString(value, { maxLength = 200 } = {}) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw validationError("Expected string value");
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw validationError(`Value must be ${maxLength} characters or fewer`);
  }
  return trimmed;
}

export function parseRequiredString(value, { maxLength = 200, fieldName = "value" } = {}) {
  if (typeof value !== "string") {
    throw validationError(`${fieldName} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw validationError(`${fieldName} is required`);
  }
  if (trimmed.length > maxLength) {
    throw validationError(`${fieldName} must be ${maxLength} characters or fewer`);
  }
  return trimmed;
}

export function parseOptionalEnum(value, allowedValues, fieldName = "value") {
  if (value === undefined || value === null || value === "") return undefined;
  if (!allowedValues.includes(value)) {
    throw validationError(`Invalid ${fieldName}`);
  }
  return value;
}

export function parseBooleanLike(value, fieldName = "value") {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  throw validationError(`Invalid ${fieldName}`);
}

export function rejectUnknownFields(body, allowedFields) {
  const bodyObject = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const unknown = Object.keys(bodyObject).filter((field) => !allowedFields.includes(field));
  if (unknown.length > 0) {
    throw validationError(`Unknown field: ${unknown[0]}`);
  }
  return bodyObject;
}
