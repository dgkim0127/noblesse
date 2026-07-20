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
const defaultPosition = Object.freeze({ x: 50, y: 50 });
const minImageScale = 1;
const maxImageScale = 2.5;

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

function validateUploadParts(parts, { allowEmpty = false } = {}) {
  const imageParts = parts.filter((part) => part.fieldName === "images");
  if (!allowEmpty && imageParts.length < 1) throw validationError("At least one product image is required");
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

function sanitizeFilename(value, fallback = "product-image.webp") {
  const filename = String(value || "").replaceAll("\\", "/").split("/").at(-1)?.trim() || fallback;
  return filename.length > 240 ? filename.slice(-240) : filename;
}

function normalizeStoredPosition(value) {
  const x = Number(value?.x);
  const y = Number(value?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { ...defaultPosition };
  return {
    x: Math.min(100, Math.max(0, x)),
    y: Math.min(100, Math.max(0, y))
  };
}

function parseManifestPosition(value) {
  if (value === undefined) return { ...defaultPosition };
  const x = Number(value?.x);
  const y = Number(value?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100) {
    throw validationError("Image position coordinates must be between 0 and 100");
  }
  return { x, y };
}

function normalizeStoredScale(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return minImageScale;
  return Math.min(maxImageScale, Math.max(minImageScale, parsed));
}

function parseManifestScale(value) {
  if (value === undefined) return minImageScale;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minImageScale || parsed > maxImageScale) {
    throw validationError(`Image scale must be between ${minImageScale} and ${maxImageScale}`);
  }
  return parsed;
}

function stableImageId(image, index = 0) {
  const explicitId = String(image?.id || "").trim();
  if (explicitId) return explicitId;
  const identity = image?.objectKeys?.detail || image?.detail || image?.url || image?.sources?.detail || `image-${index}`;
  return `image-${crypto.createHash("sha256").update(String(identity)).digest("hex").slice(0, 24)}`;
}

function normalizeStoredSources(image = {}) {
  return Object.fromEntries(Object.keys(imageVariants).map((variant) => {
    const storedSource = image.sources?.[variant];
    const url = typeof storedSource === "string" ? storedSource : storedSource?.url || image[variant] || (variant === "detail" ? image.url : "");
    const objectKey = image.objectKeys?.[variant] || storedSource?.objectKey || "";
    return [variant, {
      url,
      objectKey,
      sizeBytes: Number(storedSource?.sizeBytes || (variant === "detail" ? image.sizeBytes : 0)) || 0
    }];
  }));
}

function normalizeStoredGallery(product = {}) {
  const imageSet = product.imageSet || {};
  const imageAlt = product.imageAlt || {};
  const gallery = Array.isArray(imageSet.gallery) && imageSet.gallery.length > 0
    ? imageSet.gallery
    : (imageSet.detail || imageSet.primary || imageSet.card || imageSet.thumb)
      ? [{
          thumb: imageSet.thumb,
          card: imageSet.card,
          detail: imageSet.detail || imageSet.primary,
          zoom: imageSet.zoom,
          url: imageSet.detail || imageSet.primary,
          position: imageSet.position,
          scale: imageSet.scale
        }]
      : [];

  return gallery
    .map((image, index) => {
      const alt = imageAlt.gallery?.find?.((item) => item?.id && item.id === image.id)
        || imageAlt.gallery?.[index]
        || {};
      return {
        id: stableImageId(image, index),
        filename: sanitizeFilename(image.filename, `product-image-${index + 1}.webp`),
        sources: normalizeStoredSources(image),
        mimeType: image.mimeType || "image/webp",
        sizeBytes: Number(image.sizeBytes) || 0,
        sortOrder: index,
        isPrimary: index === 0,
        altText: sanitizeAltText(alt.altText || image.altText || (index === 0 ? imageAlt.default : "")),
        position: normalizeStoredPosition(image.position || (index === 0 ? imageSet.position : undefined)),
        scale: normalizeStoredScale(image.scale ?? (index === 0 ? imageSet.scale : undefined))
      };
    });
}

function getImageObjectKeys(images = []) {
  const keys = new Set();
  for (const image of images) {
    for (const source of Object.values(image.sources || {})) {
      if (source?.objectKey?.startsWith("products/")) keys.add(source.objectKey);
    }
  }
  return [...keys];
}

function buildObjectKey(productId, upload, requestId, variant) {
  return `products/${productId}/${Date.now()}-${requestId || crypto.randomUUID()}-${upload.index}-${variant}.webp`;
}

function getStoredVariant(image, variant) {
  const direct = image?.sources?.[variant];
  if (direct?.url) return direct;
  return image?.sources?.detail
    || image?.sources?.card
    || image?.sources?.thumb
    || image?.sources?.zoom
    || { url: "", objectKey: "", sizeBytes: 0 };
}

function encodeMediaKey(objectKey) {
  return Buffer.from(objectKey, "utf8").toString("base64url");
}

function buildImageSet(images, primaryIndex = 0) {
  const primary = images[primaryIndex] || images[0];
  const gallery = images.map((image, index) => {
    const sources = Object.fromEntries(Object.keys(imageVariants).map((variant) => [variant, getStoredVariant(image, variant)]));
    return {
      id: image.id || crypto.randomUUID(),
      filename: sanitizeFilename(image.filename, `product-image-${index + 1}.webp`),
      url: sources.detail.url,
      thumb: sources.thumb.url,
      card: sources.card.url,
      detail: sources.detail.url,
      zoom: sources.zoom.url,
      sources: Object.fromEntries(Object.entries(sources).map(([key, source]) => [key, source.url])),
      objectKeys: Object.fromEntries(Object.entries(sources).map(([key, source]) => [key, source.objectKey])),
      mimeType: image.mimeType || "image/webp",
      sizeBytes: sources.detail.sizeBytes,
      sortOrder: index,
      isPrimary: index === primaryIndex,
      position: normalizeStoredPosition(image.position),
      scale: normalizeStoredScale(image.scale)
    };
  });
  if (!primary) return { gallery };
  const primarySources = Object.fromEntries(Object.keys(imageVariants).map((variant) => [variant, getStoredVariant(primary, variant)]));
  return {
    thumb: primarySources.thumb.url,
    card: primarySources.card.url,
    detail: primarySources.detail.url,
    zoom: primarySources.zoom.url,
    primary: primarySources.detail.url,
    position: normalizeStoredPosition(primary.position),
    scale: normalizeStoredScale(primary.scale),
    gallery
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

function buildImageAlt(images, localizedAlt = {}, primaryIndex = 0) {
  const primary = images[primaryIndex] || images[0];
  return {
    default: primary?.altText || "",
    translations: Object.fromEntries(
      ["kr", "en", "jp", "zh-TW"]
        .map((locale) => [locale, sanitizeAltText(localizedAlt?.[locale])])
        .filter(([, value]) => value)
    ),
    gallery: images.map((image, index) => ({
      id: image.id,
      altText: image.altText || "",
      sortOrder: index,
      isPrimary: index === primaryIndex
    }))
  };
}

function parseManifestItems(metadata, uploads, existingImages) {
  if (!Array.isArray(metadata.items)) return null;
  if (metadata.items.length > maxImages) throw validationError("Too many product images");

  const existingById = new Map();
  existingImages.forEach((image) => {
    existingById.set(image.id, image);
    for (const source of Object.values(image.sources || {})) {
      if (source?.url) existingById.set(source.url, image);
    }
  });
  const usedExisting = new Set();
  const usedUploads = new Set();

  const items = metadata.items.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw validationError("Invalid image manifest item");
    }
    const hasExisting = typeof item.existingId === "string" && item.existingId.trim();
    const hasUpload = Number.isInteger(item.uploadIndex);
    if (Boolean(hasExisting) === Boolean(hasUpload)) {
      throw validationError("Each image manifest item must reference one image");
    }
    const presentation = {
      altText: sanitizeAltText(item.altText),
      position: parseManifestPosition(item.position),
      scale: parseManifestScale(item.scale),
      sortOrder: index,
      isPrimary: index === 0
    };
    if (hasExisting) {
      const existing = existingById.get(item.existingId.trim());
      if (!existing || usedExisting.has(existing.id)) throw validationError("Unknown or duplicate existing image");
      usedExisting.add(existing.id);
      return { ...existing, ...presentation };
    }
    if (item.uploadIndex < 0 || item.uploadIndex >= uploads.length || usedUploads.has(item.uploadIndex)) {
      throw validationError("Unknown or duplicate uploaded image");
    }
    usedUploads.add(item.uploadIndex);
    return { uploadIndex: item.uploadIndex, ...presentation };
  });

  if (usedUploads.size !== uploads.length) throw validationError("Every uploaded image must appear in the image manifest");
  return items;
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
  if (!["products/", "home-showcase/"].some((prefix) => objectKey.startsWith(prefix))) {
    throw validationError("Invalid media key");
  }
  return objectKey;
}

export function createAdminProductImageService({ queries, objectStore, imageTransformer = transformProductImage }) {
  return {
    async uploadProductImages({ productId, contentType, body, adminViewer }) {
      const parts = parseMultipartFormData({ contentType, body });
      const metadata = parseMetadata(parts);
      const manifestMode = Array.isArray(metadata.items);
      const images = validateUploadParts(parts, { allowEmpty: manifestMode });
      const product = manifestMode ? await queries.getProduct(productId) : null;
      if (manifestMode && !product) throw notFound("Product not found");
      const existingImages = manifestMode ? normalizeStoredGallery(product) : [];
      const manifestItems = manifestMode ? parseManifestItems(metadata, images, existingImages) : null;
      if (manifestMode && product.isVisible && manifestItems.length === 0) {
        throw validationError("A visible product must keep at least one image");
      }
      const primaryIndex = manifestMode ? 0 : clampPrimaryIndex(metadata.primaryIndex, images.length);
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
            id: crypto.randomUUID(),
            filename: sanitizeFilename(image.filename),
            sources,
            mimeType: "image/webp",
            sortOrder: image.index,
            isPrimary: image.index === primaryIndex,
            altText: sanitizeAltText(altTexts[image.index]),
            position: { ...defaultPosition },
            scale: minImageScale
          });
        }

        const finalImages = manifestMode
          ? manifestItems.map((item, index) => {
              const source = Number.isInteger(item.uploadIndex) ? uploadedImages[item.uploadIndex] : item;
              return {
                ...source,
                altText: item.altText,
                position: item.position,
                scale: item.scale,
                sortOrder: index,
                isPrimary: index === 0
              };
            })
          : uploadedImages;
        const imageSet = buildImageSet(finalImages, primaryIndex);
        const imageAlt = buildImageAlt(finalImages, metadata.localizedAlt, primaryIndex);
        const result = await queries.updateProductImages(productId, { imageSet, imageAlt }, adminViewer);
        if (!result) {
          throw notFound("Product not found");
        }
        const { replacedObjectKeys = [], ...safeResult } = result;
        const retainedKeySet = new Set(getImageObjectKeys(finalImages));
        await cleanupUploadedObjects(
          objectStore,
          replacedObjectKeys.filter((objectKey) => !retainedKeySet.has(objectKey))
        );

        return {
          ...safeResult,
          images: finalImages
        };
      } catch (error) {
        await cleanupUploadedObjects(objectStore, uploadedObjectKeys);
        throw error;
      }
    }
  };
}
