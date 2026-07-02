import { Router } from "express";
import { validationError } from "../utils/errors.js";
import { decodeMediaKey } from "../services/adminProductImageService.js";

const productCodePattern = /^[A-Z0-9][A-Z0-9-]{1,39}$/i;

function inferMediaContentType(objectKey) {
  if (String(objectKey).endsWith(".png")) return "image/png";
  if (String(objectKey).endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function createCatalogRoutes({ catalogService, mediaService }) {
  const router = Router();

  router.get(
    "/products",
    asyncRoute(async (req, res) => {
      const products = await catalogService.listProducts({ viewer: req.viewer || null });
      res.json({ products });
    })
  );

  router.get(
    "/banners",
    asyncRoute(async (req, res) => {
      const banners = await catalogService.listBanners();
      res.json({ banners });
    })
  );

  router.get(
    "/media/:mediaKey",
    asyncRoute(async (req, res) => {
      const objectKey = decodeMediaKey(req.params.mediaKey);
      res.setHeader("cache-control", "public, max-age=31536000, immutable");
      res.setHeader("content-type", inferMediaContentType(objectKey));
      const stream = await mediaService.createReadStream(req.params.mediaKey);
      stream.on("error", (error) => {
        res.destroy(error);
      });
      stream.pipe(res);
    })
  );

  router.get(
    "/products/:productCode",
    asyncRoute(async (req, res) => {
      const { productCode } = req.params;
      if (!productCodePattern.test(productCode)) {
        throw validationError("Invalid product code");
      }

      const product = await catalogService.getProductByCode(productCode, {
        viewer: req.viewer || null
      });
      res.json({ product });
    })
  );

  return router;
}
