const DEFAULT_MESSAGE = "Request failed. Please try again.";

export class ApiClientError extends Error {
  constructor({ code = "INTERNAL_ERROR", message = DEFAULT_MESSAGE, requestId = "", status = 0 } = {}) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.requestId = requestId || "";
    this.status = status || 0;
  }
}

export function getRequestIdFromResponse(response) {
  return response?.headers?.get?.("x-request-id") || "";
}

function safeMessageForCode(code, message, fallbackMessage) {
  if (code === "INTERNAL_ERROR") {
    return fallbackMessage || DEFAULT_MESSAGE;
  }

  return typeof message === "string" && message.trim() ? message : fallbackMessage || DEFAULT_MESSAGE;
}

export function normalizeApiError(responseBody, fallbackMessage = DEFAULT_MESSAGE) {
  const error = responseBody?.error;
  const code = typeof error?.code === "string" && error.code.trim() ? error.code : "INTERNAL_ERROR";
  const requestId = typeof error?.requestId === "string" ? error.requestId : "";
  const message = safeMessageForCode(code, error?.message, fallbackMessage);

  return {
    code,
    message,
    requestId
  };
}

export function createNetworkError(message = "Network request failed") {
  return new ApiClientError({
    code: "NETWORK_ERROR",
    message,
    status: 0
  });
}
