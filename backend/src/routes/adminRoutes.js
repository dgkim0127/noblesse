import express, { Router } from "express";
import { notFound } from "../utils/errors.js";

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function withRequestId(req, meta = {}) {
  return {
    ...meta,
    requestId: req.id
  };
}

function createImageUploadParser() {
  return express.raw({
    limit: "82mb",
    type: (req) => String(req.headers["content-type"] || "").includes("multipart/form-data")
  });
}

export function createAdminRoutes({ services, requireAdmin, imageUploadParser = createImageUploadParser() }) {
  const router = Router();

  router.get(
    "/dashboard",
    requireAdmin,
    asyncRoute(async (req, res) => {
      const data = await services.dashboard.getDashboard(req.adminViewer);
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.get(
    "/inquiries",
    requireAdmin,
    asyncRoute(async (req, res) => {
      const result = await services.inquiries.listInquiries(req.query, req.adminViewer);
      res.json({
        data: { inquiries: result.inquiries },
        meta: withRequestId(req, result.meta)
      });
    })
  );

  router.patch(
    "/inquiries/:inquiryId/memo",
    requireAdmin,
    asyncRoute(async (req, res) => {
      const data = await services.inquiries.updateInquiryMemo(
        req.params.inquiryId,
        req.body,
        req.adminViewer
      );
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.patch(
    "/inquiries/:inquiryId/status",
    requireAdmin,
    asyncRoute(async (req, res) => {
      const data = await services.inquiries.updateInquiryStatus(
        req.params.inquiryId,
        req.body,
        req.adminViewer
      );
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.get(
    "/inquiries/:inquiryId",
    requireAdmin,
    asyncRoute(async (req, res) => {
      const data = await services.inquiries.getInquiryById(
        req.params.inquiryId,
        req.adminViewer
      );
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.get(
    "/buyers",
    requireAdmin,
    asyncRoute(async (req, res) => {
      const result = await services.buyers.listBuyers(req.query, req.adminViewer);
      res.json({
        data: { buyers: result.buyers },
        meta: withRequestId(req, result.meta)
      });
    })
  );

  router.get(
    "/buyers/:buyerId",
    requireAdmin,
    asyncRoute(async (req, res) => {
      const data = await services.buyers.getBuyerById(
        req.params.buyerId,
        req.adminViewer
      );
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.patch(
    "/buyers/:buyerId/status",
    requireAdmin,
    asyncRoute(async (req, res) => {
      const data = await services.buyers.updateBuyerStatus(
        req.params.buyerId,
        req.body,
        req.adminViewer
      );
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.get(
    "/products",
    requireAdmin,
    asyncRoute(async (req, res) => {
      const result = await services.products.listProducts(req.query, req.adminViewer);
      res.json({
        data: { products: result.products },
        meta: withRequestId(req, result.meta)
      });
    })
  );

  router.get(
    "/categories",
    requireAdmin,
    asyncRoute(async (req, res) => {
      const result = await services.categories.listCategories(req.query, req.adminViewer);
      res.json({
        data: { categories: result.categories },
        meta: withRequestId(req, result.meta)
      });
    })
  );

  router.post(
    "/categories",
    requireAdmin,
    asyncRoute(async (req, res) => {
      const data = await services.categories.createCategory(req.body, req.adminViewer);
      res.status(201).json({ data, meta: withRequestId(req) });
    })
  );

  router.patch(
    "/categories/:categoryId",
    requireAdmin,
    asyncRoute(async (req, res) => {
      const data = await services.categories.updateCategory(
        req.params.categoryId,
        req.body,
        req.adminViewer
      );
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.post(
    "/products",
    requireAdmin,
    asyncRoute(async (req, res) => {
      const data = await services.products.createProduct(req.body, req.adminViewer);
      res.status(201).json({ data, meta: withRequestId(req) });
    })
  );

  router.get(
    "/prices",
    requireAdmin,
    asyncRoute(async (req, res) => {
      const result = await services.prices.listPrices(req.query, req.adminViewer);
      res.json({
        data: { prices: result.prices },
        meta: withRequestId(req, result.meta)
      });
    })
  );

  router.post(
    "/prices",
    requireAdmin,
    asyncRoute(async (req, res) => {
      const data = await services.prices.createPrice(req.body, req.adminViewer);
      res.status(201).json({ data, meta: withRequestId(req) });
    })
  );

  router.patch(
    "/prices/:priceId",
    requireAdmin,
    asyncRoute(async (req, res) => {
      const data = await services.prices.updatePrice(
        req.params.priceId,
        req.body,
        req.adminViewer
      );
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.patch(
    "/products/:productId/visibility",
    requireAdmin,
    asyncRoute(async (req, res) => {
      const data = await services.products.updateProductVisibility(
        req.params.productId,
        req.body,
        req.adminViewer
      );
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.patch(
    "/products/:productId",
    requireAdmin,
    asyncRoute(async (req, res) => {
      const data = await services.products.updateProduct(
        req.params.productId,
        req.body,
        req.adminViewer
      );
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.post(
    "/products/:productId/images",
    requireAdmin,
    imageUploadParser,
    asyncRoute(async (req, res) => {
      const data = await services.products.uploadProductImages(
        req.params.productId,
        {
          contentType: req.headers["content-type"] || "",
          body: req.body
        },
        req.adminViewer
      );
      res.status(201).json({ data, meta: withRequestId(req) });
    })
  );

  router.get(
    "/quotes",
    requireAdmin,
    asyncRoute(async (req, res) => {
      const result = await services.quotes.listQuotes(req.query, req.adminViewer);
      res.json({
        data: { quotes: result.quotes },
        meta: withRequestId(req, result.meta)
      });
    })
  );

  router.post(
    "/quotes",
    requireAdmin,
    asyncRoute(async (req, res) => {
      const data = await services.quotes.createQuote(req.body, req.adminViewer);
      res.status(201).json({ data, meta: withRequestId(req) });
    })
  );

  router.get(
    "/quotes/:quoteId",
    requireAdmin,
    asyncRoute(async (req, res) => {
      const data = await services.quotes.getQuoteById(req.params.quoteId, req.adminViewer);
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.patch(
    "/quotes/:quoteId/status",
    requireAdmin,
    asyncRoute(async (req, res) => {
      const data = await services.quotes.updateQuoteStatus(
        req.params.quoteId,
        req.body,
        req.adminViewer
      );
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.delete("*", () => {
    throw notFound("Admin delete routes are not implemented");
  });

  return router;
}
