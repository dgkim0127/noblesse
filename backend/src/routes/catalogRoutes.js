import { Router } from "express";
import { validationError } from "../utils/errors.js";

const productCodePattern = /^[A-Z0-9][A-Z0-9-]{1,39}$/i;

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function createCatalogRoutes({ catalogService }) {
  const router = Router();

  router.get(
    "/products",
    asyncRoute(async (req, res) => {
      const products = await catalogService.listProducts({ viewer: req.viewer || null });
      res.json({ products });
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
