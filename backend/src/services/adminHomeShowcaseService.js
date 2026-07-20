import crypto from "node:crypto";
import {
  notFound,
  payloadTooLarge,
  unsupportedMediaType,
  validationError
} from "../utils/errors.js";
import { parseMultipartFormData } from "../utils/multipart.js";
import {
  parseBooleanLike,
  parseOptionalString,
  parseRequiredString,
  rejectUnknownFields,
  validateUuid
} from "../utils/validators.js";
import { transformProductImage } from "./adminProductImageService.js";

const locales = ["kr", "en", "jp", "zh-TW"];
const variants = ["thumb", "card", "detail", "zoom"];
const maxSlides = 12;
const maxFileBytes = 10 * 1024 * 1024;
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const defaultImagePosition = Object.freeze({ x: 50, y: 50 });
const slideWriteFields = [
  "internalName",
  "label",
  "title",
  "eyebrow",
  "description",
  "targetUrl",
  "imagePosition",
  "sortOrder",
  "isActive"
];

function parseInteger(value, fieldName) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw validationError(`Invalid ${fieldName}`);
  return parsed;
}

function parseLocalized(value, fieldName, maxLength) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw validationError(`${fieldName} must be an object`);
  }
  const unknownLocale = Object.keys(value).find((locale) => !locales.includes(locale));
  if (unknownLocale) throw validationError(`Invalid ${fieldName} locale`);
  return Object.fromEntries(
    locales.map((locale) => [locale, parseOptionalString(value[locale], { maxLength }) || ""])
  );
}

function parseTargetUrl(value, { required = false } = {}) {
  const parsed = required
    ? parseRequiredString(value, { fieldName: "targetUrl", maxLength: 500 })
    : parseOptionalString(value, { maxLength: 500 });
  if (parsed !== undefined && (!parsed.startsWith("/") || parsed.startsWith("//"))) {
    throw validationError("targetUrl must be an internal site path");
  }
  return parsed;
}

function parseImagePosition(value) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw validationError("imagePosition must be an object");
  }
  const safePosition = rejectUnknownFields(value, ["x", "y"]);
  const x = Number(safePosition.x);
  const y = Number(safePosition.y);
  if (![x, y].every((coordinate) => Number.isInteger(coordinate) && coordinate >= 0 && coordinate <= 100)) {
    throw validationError("imagePosition coordinates must be integers from 0 to 100");
  }
  return { x, y };
}

function normalizeStoredImagePosition(value) {
  const x = Number(value?.x);
  const y = Number(value?.y);
  if (![x, y].every((coordinate) => Number.isInteger(coordinate) && coordinate >= 0 && coordinate <= 100)) {
    return defaultImagePosition;
  }
  return { x, y };
}

function parseSlideBody(body = {}, { partial = false } = {}) {
  const safeBody = rejectUnknownFields(body, slideWriteFields);
  const parsed = {
    internalName: partial
      ? parseOptionalString(safeBody.internalName, { maxLength: 120 })
      : parseRequiredString(safeBody.internalName, { fieldName: "internalName", maxLength: 120 }),
    label: Object.hasOwn(safeBody, "label")
      ? (parseOptionalString(safeBody.label, { maxLength: 24 }) || "")
      : undefined,
    title: parseLocalized(safeBody.title, "title", 160),
    eyebrow: parseLocalized(safeBody.eyebrow, "eyebrow", 80),
    description: parseLocalized(safeBody.description, "description", 300),
    targetUrl: parseTargetUrl(safeBody.targetUrl, { required: !partial }),
    imagePosition: parseImagePosition(safeBody.imagePosition),
    sortOrder: parseInteger(safeBody.sortOrder, "sortOrder"),
    isActive: parseBooleanLike(safeBody.isActive, "isActive")
  };
  if (!partial) {
    parsed.label = parsed.label || "NOBLESSE";
    parsed.title = parsed.title || Object.fromEntries(locales.map((locale) => [locale, ""]));
    parsed.eyebrow = parsed.eyebrow || Object.fromEntries(locales.map((locale) => [locale, ""]));
    parsed.description = parsed.description || Object.fromEntries(locales.map((locale) => [locale, ""]));
    parsed.targetUrl = parsed.targetUrl || "/products";
    parsed.imagePosition = parsed.imagePosition || defaultImagePosition;
    parsed.sortOrder = parsed.sortOrder ?? 0;
    parsed.isActive = parsed.isActive ?? false;
  }
  return Object.fromEntries(Object.entries(parsed).filter(([, value]) => value !== undefined));
}

function completionFor(slide) {
  const missing = [];
  for (const locale of locales) {
    if (!String(slide.title?.[locale] || "").trim()) missing.push(`title.${locale}`);
  }
  if (!slide.imageSet?.detail) missing.push("image");
  if (!slide.targetUrl) missing.push("targetUrl");
  return { isPublishable: missing.length === 0, missing };
}

function withCompletion(slide) {
  return { ...slide, completion: completionFor(slide) };
}

function assertPublishable(slide) {
  const completion = completionFor(slide);
  if (!completion.isPublishable) {
    throw validationError(`Home showcase slide is incomplete: ${completion.missing.join(", ")}`);
  }
}

function mergeSlide(existing, input) {
  return {
    ...existing,
    ...input,
    title: input.title ?? existing.title,
    eyebrow: input.eyebrow ?? existing.eyebrow,
    description: input.description ?? existing.description
  };
}

function detectMime(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return "";
}

function parseImageUpload({ contentType, body }) {
  const parts = parseMultipartFormData({ contentType, body });
  const image = parts.find((part) => part.fieldName === "image");
  if (!image) throw validationError("A home showcase image is required");
  if (!allowedMimeTypes.has(image.contentType)) throw unsupportedMediaType("Unsupported image type");
  if (!image.buffer.length) throw validationError("Image file is empty");
  if (image.buffer.length > maxFileBytes) throw payloadTooLarge("Image file is too large");
  const detected = detectMime(image.buffer);
  if (!detected || detected !== image.contentType) {
    throw unsupportedMediaType("Image signature does not match content type");
  }
  return image.buffer;
}

function encodeMediaKey(objectKey) {
  return Buffer.from(objectKey, "utf8").toString("base64url");
}

async function cleanup(objectStore, objectKeys) {
  if (!objectKeys?.length) return;
  try {
    await objectStore.deleteMany(objectKeys);
  } catch (error) {
    console.error("Home showcase image cleanup failed", {
      objectCount: objectKeys.length,
      message: error?.message || "cleanup failed"
    });
  }
}

export function createAdminHomeShowcaseService({ queries, objectStore, imageTransformer = transformProductImage }) {
  return {
    async listSlides() {
      const slides = await queries.listAdminSlides();
      return slides.map(withCompletion);
    },

    async createSlide(body = {}, adminViewer) {
      const existing = await queries.listAdminSlides();
      if (existing.length >= maxSlides) throw validationError(`Up to ${maxSlides} home showcase slides are allowed`);
      const input = parseSlideBody(body);
      if (input.isActive) assertPublishable(input);
      return withCompletion(await queries.createSlide(input, adminViewer));
    },

    async updateSlide(slideId, body = {}, adminViewer) {
      const id = validateUuid(slideId, "slideId");
      const existing = await queries.getSlide(id);
      if (!existing) throw notFound("Home showcase slide not found");
      const input = parseSlideBody(body, { partial: true });
      const next = mergeSlide(existing, input);
      if (next.isActive) assertPublishable(next);
      const slide = await queries.updateSlide(id, input, adminViewer);
      if (!slide) throw notFound("Home showcase slide not found");
      return withCompletion(slide);
    },

    async uploadImage(slideId, upload, adminViewer) {
      const id = validateUuid(slideId, "slideId");
      const existing = await queries.getSlide(id);
      if (!existing) throw notFound("Home showcase slide not found");
      const buffer = parseImageUpload(upload);
      const transformed = await imageTransformer(buffer);
      const uploadedKeys = [];
      try {
        const imageSet = {
          objectKeys: {},
          position: normalizeStoredImagePosition(existing.imageSet?.position)
        };
        for (const variant of variants) {
          const variantBuffer = transformed[variant];
          if (!Buffer.isBuffer(variantBuffer) || !variantBuffer.length) {
            throw validationError(`Unable to create ${variant} image`);
          }
          const objectKey = `home-showcase/${id}/${Date.now()}-${crypto.randomUUID()}-${variant}.webp`;
          await objectStore.save({ objectKey, buffer: variantBuffer, contentType: "image/webp" });
          uploadedKeys.push(objectKey);
          imageSet[variant] = `/api/catalog/media/${encodeMediaKey(objectKey)}`;
          imageSet.objectKeys[variant] = objectKey;
        }
        const imageAlt = {
          default: existing.title?.kr || existing.title?.en || existing.internalName,
          translations: Object.fromEntries(locales.map((locale) => [locale, existing.title?.[locale] || existing.internalName]))
        };
        const result = await queries.updateSlideImage(id, { imageSet, imageAlt }, adminViewer);
        if (!result) throw notFound("Home showcase slide not found");
        await cleanup(objectStore, result.replacedObjectKeys);
        return withCompletion(result.slide);
      } catch (error) {
        await cleanup(objectStore, uploadedKeys);
        throw error;
      }
    },

    async reorderSlides(body = {}, adminViewer) {
      const safeBody = rejectUnknownFields(body, ["ids"]);
      if (!Array.isArray(safeBody.ids) || safeBody.ids.length < 1 || safeBody.ids.length > maxSlides) {
        throw validationError("ids must contain the ordered slide ids");
      }
      const ids = safeBody.ids.map((id) => validateUuid(id, "slideId"));
      if (new Set(ids).size !== ids.length) throw validationError("Slide ids must be unique");
      const allSlides = await queries.listAdminSlides();
      if (ids.length !== allSlides.length || allSlides.some((slide) => !ids.includes(slide.id))) {
        throw validationError("ids must include every home showcase slide exactly once");
      }
      const slides = await queries.reorderSlides(ids, adminViewer);
      if (!slides) throw notFound("Home showcase slide not found");
      return slides.map(withCompletion);
    },

    async deleteSlide(slideId, adminViewer) {
      const id = validateUuid(slideId, "slideId");
      const result = await queries.deleteSlide(id, adminViewer);
      if (!result) throw notFound("Home showcase slide not found");
      await cleanup(objectStore, result.objectKeys);
      return { id, deleted: true };
    }
  };
}
