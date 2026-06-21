import { validationError } from "./errors.js";

function parseHeaderBlock(headerText) {
  const headers = new Map();
  for (const line of headerText.split("\r\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    headers.set(
      line.slice(0, separator).trim().toLowerCase(),
      line.slice(separator + 1).trim()
    );
  }
  return headers;
}

function parseContentDisposition(value = "") {
  const result = {};
  for (const part of value.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawValue.length) continue;
    const key = rawKey.trim().toLowerCase();
    const valueText = rawValue.join("=").trim().replace(/^"|"$/g, "");
    result[key] = valueText;
  }
  return result;
}

function readBoundary(contentType = "") {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  return match?.[1] || match?.[2] || "";
}

function trimLineBreaks(buffer) {
  let start = 0;
  let end = buffer.length;
  if (buffer[0] === 13 && buffer[1] === 10) start = 2;
  if (buffer[end - 2] === 13 && buffer[end - 1] === 10) end -= 2;
  return buffer.subarray(start, end);
}

export function parseMultipartFormData({ contentType, body }) {
  const boundary = readBoundary(contentType);
  if (!boundary) {
    throw validationError("multipart boundary is required");
  }
  if (!Buffer.isBuffer(body)) {
    throw validationError("multipart body is required");
  }

  const delimiter = Buffer.from(`--${boundary}`);
  const parts = [];
  let cursor = body.indexOf(delimiter);

  while (cursor !== -1) {
    const next = body.indexOf(delimiter, cursor + delimiter.length);
    if (next === -1) break;
    const segment = trimLineBreaks(body.subarray(cursor + delimiter.length, next));
    cursor = next;
    if (!segment.length || segment.equals(Buffer.from("--"))) continue;
    if (segment[0] === 45 && segment[1] === 45) continue;

    const headerEnd = segment.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd === -1) continue;
    const headers = parseHeaderBlock(segment.subarray(0, headerEnd).toString("latin1"));
    const disposition = parseContentDisposition(headers.get("content-disposition"));
    if (!disposition.name) continue;

    parts.push({
      fieldName: disposition.name,
      filename: disposition.filename || "",
      contentType: headers.get("content-type") || "",
      buffer: segment.subarray(headerEnd + 4)
    });
  }

  return parts;
}
