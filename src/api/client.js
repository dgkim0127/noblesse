import { ApiClientError, createNetworkError, getRequestIdFromResponse, normalizeApiError } from "./errors.js";

function normalizeBaseUrl(baseUrl) {
  if (!baseUrl || baseUrl === "/") return "";
  return String(baseUrl).replace(/\/+$/, "");
}

function normalizePath(path) {
  if (!path) return "/";
  return String(path).startsWith("/") ? String(path) : `/${path}`;
}

function buildUrl(baseUrl, path) {
  return `${normalizeBaseUrl(baseUrl)}${normalizePath(path)}`;
}

async function parseResponseBody(response, responseType = "json") {
  if (responseType === "blob" && response.ok) {
    return response.blob();
  }
  const contentType = response.headers?.get?.("content-type") || "";
  if (!contentType.includes("application/json")) {
    return null;
  }
  return response.json();
}

function buildRequestBody(body, headers) {
  if (body === undefined || body === null) return undefined;
  if (typeof FormData !== "undefined" && body instanceof FormData) return body;
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return typeof body === "string" ? body : JSON.stringify(body);
}

export function createApiClient({ baseUrl = "/api", fetchImpl = fetch } = {}) {
  async function apiFetch(path, options = {}) {
    const { token, headers: inputHeaders, body, responseType = "json", ...fetchOptions } = options;
    const headers = new Headers(inputHeaders || {});

    if (!headers.has("accept")) {
      headers.set("accept", "application/json");
    }
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }

    const requestBody = buildRequestBody(body, headers);
    const url = buildUrl(baseUrl, path);

    let response;
    try {
      response = await fetchImpl(url, {
        ...fetchOptions,
        headers,
        body: requestBody
      });
    } catch (error) {
      if (error instanceof ApiClientError) throw error;
      throw createNetworkError();
    }

    const responseBody = await parseResponseBody(response, responseType);
    if (!response.ok) {
      const normalized = normalizeApiError(responseBody);
      throw new ApiClientError({
        ...normalized,
        requestId: normalized.requestId || getRequestIdFromResponse(response),
        status: response.status
      });
    }

    return {
      data: responseBody,
      headers: response.headers,
      requestId: getRequestIdFromResponse(response),
      status: response.status
    };
  }

  return {
    apiFetch
  };
}
