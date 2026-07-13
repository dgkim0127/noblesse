import crypto from "node:crypto";
import admin from "firebase-admin";
import sharp from "sharp";
import { getFirebaseAdminApp } from "../auth/firebaseAuth.js";
import {
  internalError,
  notFound,
  payloadTooLarge,
  unsupportedMediaType,
  validationError
} from "../utils/errors.js";
import { parseMultipartFormData } from "../utils/multipart.js";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImages = 8;
const maxFileBytes = 10 * 1024 * 1024;
const imageVariants = {
  thumb: 300,
  card: 600,
  detail: 1200,
  zoom: 1800
};

function detectImageMime(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return "";
}

function parseMetadata(parts) {
  const metadataPart = parts.find((part) => part.fieldName === "metadata");
  if (!metadataPart) return {};
  try {
    return JSON.parse(metadataPart.buffer.toString("utf8"));
  } catch {
    throw validationError("Invalid image metadata");
  }
}

function validateUploadParts(parts) {
  const imageParts = parts.filter((part) => part.fieldName === "images");
  if (imageParts.length < 1) throw validationError("At least one product image is required");
  if (imageParts.length > maxImages) throw validationError("Too many product images");

  return imageParts.map((part, index) => {
    if (!allowedMimeTypes.has(part.contentType)) {
      throw unsupportedMediaType("Unsupported image type");
    }
    if (!part.buffer.length) throw validationError("Image file is empty");
    if (part.buffer.length > maxFileBytes) throw payloadTooLarge("Image file is too large");

    const detectedMimeType = detectImageMime(part.buffer);
    if (!detectedMimeType || detectedMimeType !== part.contentType) {
      throw unsupportedMediaType("Image signature does not match content type");
    }

    return {
      index,
      filename: part.filename,
      contentType: detectedMimeType,
      buffer: part.buffer
    };
  });
}

function clampPrimaryIndex(value, imageCount) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed >= imageCount) return 0;
  return parsed;
}

function sanitizeAltText(value) {
  const text = String(value || "").trim();
  return text.length > 200 ? text.slice(0, 200) : text;
}

function buildObjectKey(productId, upload, requestId, variant) {
  return `products/${productId}/${Date.now()}-${requestId || crypto.randomUUID()}-${upload.index}-${variant}.webp`;
}

function encodeMediaKey(objectKey) {
  return Buffer.from(objectKey, "utf8").toString("base64url");
}

function buildImageSet(uploadedImages, primaryIndex) {
  const primary = uploadedImages[primaryIndex] || uploadedImages[0];
  return {
    thumb: primary.sources.thumb.url,
    card: primary.sources.card.url,
    detail: primary.sources.detail.url,
    zoom: primary.sources.zoom.url,
    primary: primary.sources.detail.url,
    gallery: uploadedImages.map((image) => ({
      url: image.sources.detail.url,
      thumb: image.sources.thumb.url,
      card: image.sources.card.url,
      detail: image.sources.detail.url,
      zoom: image.sources.zoom.url,
      sources: Object.fromEntries(Object.entries(image.sources).map(([key, source]) => [key, source.url])),
      objectKeys: Object.fromEntries(Object.entries(image.sources).map(([key, source]) => [key, source.objectKey])),
      mimeType: "image/webp",
      sizeBytes: image.sources.detail.sizeBytes,
      sortOrder: image.sortOrder,
      isPrimary: image.isPrimary
    }))
  };
}

export async function transformProductImage(buffer) {
  const base = sharp(buffer, { failOn: "error" }).rotate();
  const transformed = {};
  for (const [variant, width] of Object.entries(imageVariants)) {
    transformed[variant] = await base
      .clone()
      .resize({ width, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  }
  return transformed;
}

function buildImageAlt(uploadedImages, primaryIndex, localizedAlt = {}) {
  const primary = uploadedImages[primaryIndex] || uploadedImages[0];
  return {
    default: primary.altText || "",
    translations: Object.fromEntries(
      ["kr", "en", "jp", "zh-TW"]
        .map((locale) => [locale, sanitizeAltText(localizedAlt?.[locale])])
        .filter(([, value]) => value)
    ),
    gallery: uploadedImages.map((image) => ({
      altText: image.altText || "",
      sortOrder: image.sortOrder,
      isPrimary: image.isPrimary
    }))
  };
}

async function cleanupUploadedObjects(objectStore, objectKeys) {
  if (!objectKeys.length) return;
  try {
    await objectStore.deleteMany(objectKeys);
  } catch (error) {
    console.error("Product image cleanup failed", {
      objectCount: objectKeys.length,
      message: error?.message || "cleanup failed"
    });
  }
}

export function createFirebaseImageObjectStore(env, adminModule = admin) {
  return {
    async save({ objectKey, buffer, contentType, cacheControl = "public, max-age=31536000" }) {
      if (!env.firebaseStorageBucket) {
        throw internalError("Firebase Storage bucket is not configured.");
      }
      const app = getFirebaseAdminApp(env, adminModule);
      const bucket = adminModule.storage(app).bucket(env.firebaseStorageBucket);
      await bucket.file(objectKey).save(buffer, {
        metadata: {
          contentType,
          cacheControl
        },
        resumable: false
      });
      return { objectKey };
    },

    async deleteMany(objectKeys = []) {
      if (!env.firebaseStorageBucket || objectKeys.length === 0) return;
      const app = getFirebaseAdminApp(env, adminModule);
      const bucket = adminModule.storage(app).bucket(env.firebaseStorageBucket);
      await Promise.allSettled(objectKeys.map((objectKey) => bucket.file(objectKey).delete({ ignoreNotFound: true })));
    },

    async createReadStream(objectKey) {
      if (!env.firebaseStorageBucket) {
        throw internalError("Firebase Storage bucket is not configured.");
      }
      const app = getFirebaseAdminApp(env, adminModule);
      const bucket = adminModule.storage(app).bucket(env.firebaseStorageBucket);
      return bucket.file(objectKey).createReadStream();
    }
  };
}

export function decodeMediaKey(mediaKey) {
  const objectKey = Buffer.from(String(mediaKey || ""), "base64url").toString("utf8");
  if (!objectKey.startsWith("products/")) {
    throw validationError("Invalid media key");
  }
  return objectKey;
}

export function createAdminProductImageService({ queries, objectStore, imageTransformer = transformProductImage }) {
  return {
    async uploadProductImages({ productId, contentType, body, adminViewer }) {
      const parts = parseMultipartFormData({ contentType, body });
      const metadata = parseMetadata(parts);
      const images = validateUploadParts(parts);
      const primaryIndex = clampPrimaryIndex(metadata.primaryIndex, images.length);
      const altTexts = Array.isArray(metadata.altTexts) ? metadata.altTexts : [];
      const uploadedObjectKeys = [];

      try {
        const uploadedImages = [];
        for (const image of images) {
          const variants = await imageTransformer(image.buffer);
          const sources = {};
          for (const variant of Object.keys(imageVariants)) {
            const variantBuffer = variants[variant];
            if (!Buffer.isBuffer(variantBuffer) || variantBuffer.length === 0) {
              throw validationError(`Unable to create ${variant} image`);
            }
            const objectKey = buildObjectKey(productId, image, adminViewer?.requestId, variant);
            await objectStore.save({ objectKey, buffer: variantBuffer, contentType: "image/webp" });
            uploadedObjectKeys.push(objectKey);
            sources[variant] = {
              objectKey,
              url: `/api/catalog/media/${encodeMediaKey(objectKey)}`,
              sizeBytes: variantBuffer.length
            };
          }
          uploadedImages.push({
            sources,
            mimeType: "image/webp",
            sortOrder: image.index,
            isPrimary: image.index === primaryIndex,
            altText: sanitizeAltText(altTexts[image.index])
          });
        }

        const imageSet = buildImageSet(uploadedImages, primaryIndex);
        const imageAlt = buildImageAlt(uploadedImages, primaryIndex, metadata.localizedAlt);
        const result = await queries.updateProductImages(productId, { imageSet, imageAlt }, adminViewer);
        if (!result) {
          throw notFound("Product not found");
        }
        const { replacedObjectKeys = [], ...safeResult } = result;
        const uploadedKeySet = new Set(uploadedObjectKeys);
        await cleanupUploadedObjects(
          objectStore,
          replacedObjectKeys.filter((objectKey) => !uploadedKeySet.has(objectKey))
        );

        return {
          ...safeResult,
          images: uploadedImages
        };
      } catch (error) {
        await cleanupUploadedObjects(objectStore, uploadedObjectKeys);
        throw error;
      }
    }
  };
}
