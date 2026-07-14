import express, { Router } from "express";
import { createRequirePermission } from "../auth/requirePermission.js";
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

export function createAdminRoutes({
  services,
  requireAdmin,
  requirePermission = createRequirePermission,
  imageUploadParser = createImageUploadParser()
}) {
  const router = Router();
  const can = (permissionKey) => requirePermission(permissionKey);
  const requireBulkPublishPermission = (req, res, next) => {
    if (["publish", "unpublish"].includes(req.body?.action)) {
      return can("catalog.publish")(req, res, next);
    }
    return next();
  };
  const requireShowcasePublishPermission = (req, res, next) => {
    if (Object.hasOwn(req.body || {}, "isActive")) {
      return can("catalog.publish")(req, res, next);
    }
    return next();
  };

  router.get(
    "/me",
    requireAdmin,
    asyncRoute(async (req, res) => {
      const data = services.access?.getCurrentAdmin
        ? await services.access.getCurrentAdmin(req.adminViewer)
        : req.adminViewer;
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.get(
    "/admins",
    requireAdmin,
    can("admins.read"),
    asyncRoute(async (req, res) => {
      const data = await services.access.listAdmins(req.query, req.adminViewer);
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.post(
    "/admins/promote",
    requireAdmin,
    can("admins.manage"),
    asyncRoute(async (req, res) => {
      const data = await services.access.promoteUserToAdmin(req.body, req.adminViewer);
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.patch(
    "/admins/:userId/role",
    requireAdmin,
    can("admins.manage"),
    asyncRoute(async (req, res) => {
      const data = await services.access.updateAdminRole(req.params.userId, req.body, req.adminViewer);
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.put(
    "/admins/:userId/permission-overrides",
    requireAdmin,
    can("admins.manage"),
    asyncRoute(async (req, res) => {
      const data = await services.access.replacePermissionOverrides(req.params.userId, req.body, req.adminViewer);
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.put(
    "/admins/:userId/permission-overrides/:permissionKey",
    requireAdmin,
    can("admins.manage"),
    asyncRoute(async (req, res) => {
      const data = await services.access.upsertPermissionOverride(
        req.params.userId,
        req.params.permissionKey,
        req.body,
        req.adminViewer
      );
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.delete(
    "/admins/:userId/permission-overrides/:permissionKey",
    requireAdmin,
    can("admins.manage"),
    asyncRoute(async (req, res) => {
      const data = await services.access.deletePermissionOverride(
        req.params.userId,
        req.params.permissionKey,
        req.adminViewer
      );
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.get(
    "/audit",
    requireAdmin,
    can("audit.read"),
    asyncRoute(async (req, res) => {
      const result = await services.access.listAuditEntries(req.query, req.adminViewer);
      res.json({
        data: { auditLogs: result.auditLogs },
        meta: withRequestId(req, result.meta)
      });
    })
  );

  router.get(
    "/dashboard",
    requireAdmin,
    can("dashboard.read"),
    asyncRoute(async (req, res) => {
      const data = await services.dashboard.getDashboard(req.adminViewer);
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.get(
    "/inquiries",
    requireAdmin,
    can("inquiries.read"),
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
    can("inquiries.manage"),
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
    can("inquiries.manage"),
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
    can("inquiries.read"),
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
    can("buyers.read"),
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
    can("buyers.read"),
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
    can("buyers.review"),
    asyncRoute(async (req, res) => {
      const data = await services.buyers.updateBuyerStatus(
        req.params.buyerId,
        req.body,
        req.adminViewer
      );
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.patch(
    "/buyers/:buyerId/verification",
    requireAdmin,
    can("buyers.review"),
    asyncRoute(async (req, res) => {
      const data = await services.buyers.updateBuyerVerification(
        req.params.buyerId,
        req.body,
        req.adminViewer
      );
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.patch(
    "/buyers/:buyerId/account-status",
    requireAdmin,
    can("buyers.suspend"),
    asyncRoute(async (req, res) => {
      const data = await services.buyers.updateBuyerAccountStatus(
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
    can("catalog.read"),
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
    can("catalog.read"),
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
    can("catalog.write"),
    asyncRoute(async (req, res) => {
      const data = await services.categories.createCategory(req.body, req.adminViewer);
      res.status(201).json({ data, meta: withRequestId(req) });
    })
  );

  router.patch(
    "/categories/:categoryId",
    requireAdmin,
    can("catalog.write"),
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
    can("catalog.write"),
    asyncRoute(async (req, res) => {
      const data = await services.products.createProduct(req.body, req.adminViewer);
      res.status(201).json({ data, meta: withRequestId(req) });
    })
  );

  router.get(
    "/prices",
    requireAdmin,
    can("prices.read"),
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
    can("prices.write"),
    asyncRoute(async (req, res) => {
      const data = await services.prices.createPrice(req.body, req.adminViewer);
      res.status(201).json({ data, meta: withRequestId(req) });
    })
  );

  router.patch(
    "/prices/:priceId",
    requireAdmin,
    can("prices.write"),
    asyncRoute(async (req, res) => {
      const data = await services.prices.updatePrice(
        req.params.priceId,
        req.body,
        req.adminViewer
      );
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.put(
    "/products/:productId/price-books",
    requireAdmin,
    can("prices.write"),
    asyncRoute(async (req, res) => {
      const data = await services.prices.setupProductPriceBooks(
        req.params.productId,
        req.body,
        req.adminViewer
      );
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.get(
    "/fx/status",
    requireAdmin,
    can("prices.read"),
    asyncRoute(async (req, res) => {
      const data = await services.fx.getStatus(req.query, req.adminViewer);
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.get(
    "/fx/rates",
    requireAdmin,
    can("prices.read"),
    asyncRoute(async (req, res) => {
      const data = await services.fx.listRates(req.query, req.adminViewer);
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.get(
    "/fx/runs",
    requireAdmin,
    can("prices.read"),
    asyncRoute(async (req, res) => {
      const data = await services.fx.listRuns(req.query, req.adminViewer);
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.get(
    "/fx/prices",
    requireAdmin,
    can("prices.read"),
    asyncRoute(async (req, res) => {
      const data = await services.fx.listPrices(req.query, req.adminViewer);
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.get(
    "/fx/prices/:policyId/history",
    requireAdmin,
    can("prices.read"),
    asyncRoute(async (req, res) => {
      const data = await services.fx.listHistory(req.params.policyId, req.query, req.adminViewer);
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.post(
    "/fx/rates/import",
    requireAdmin,
    can("prices.write"),
    asyncRoute(async (req, res) => {
      const data = await services.fx.importRates(req.body, req.adminViewer);
      res.status(201).json({ data, meta: withRequestId(req) });
    })
  );

  router.post(
    "/fx/evaluate",
    requireAdmin,
    can("prices.write"),
    asyncRoute(async (req, res) => {
      const data = await services.fx.evaluateAll(req.body, req.adminViewer);
      res.status(201).json({ data, meta: withRequestId(req) });
    })
  );

  router.post(
    "/fx/products/:productId/evaluate",
    requireAdmin,
    can("prices.write"),
    asyncRoute(async (req, res) => {
      const data = await services.fx.evaluateProduct(req.params.productId, req.body, req.adminViewer);
      res.status(201).json({ data, meta: withRequestId(req) });
    })
  );

  router.put(
    "/fx/products/:productId/markets/:market/mode",
    requireAdmin,
    can("prices.write"),
    asyncRoute(async (req, res) => {
      const data = await services.fx.setProductMarketMode(req.params.productId, req.params.market, req.body, req.adminViewer);
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.post(
    "/fx/prices/:policyId/pause",
    requireAdmin,
    can("prices.write"),
    asyncRoute(async (req, res) => {
      const data = await services.fx.pausePrice(req.params.policyId, req.body, req.adminViewer);
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.post(
    "/fx/prices/:policyId/resume",
    requireAdmin,
    can("prices.write"),
    asyncRoute(async (req, res) => {
      const data = await services.fx.resumePrice(req.params.policyId, req.body, req.adminViewer);
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.all(
    ["/fx/drafts", "/fx/drafts/*", "/fx/review-runs"],
    requireAdmin,
    asyncRoute(async () => {
      throw notFound("Admin FX approval draft routes are not implemented");
    })
  );

  router.patch(
    "/products/bulk",
    requireAdmin,
    can("catalog.write"),
    requireBulkPublishPermission,
    asyncRoute(async (req, res) => {
      const data = await services.products.bulkUpdateProducts(req.body, req.adminViewer);
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.get(
    "/home-showcase",
    requireAdmin,
    can("catalog.read"),
    asyncRoute(async (req, res) => {
      const slides = await services.homeShowcase.listSlides(req.adminViewer);
      res.json({ data: { slides }, meta: withRequestId(req) });
    })
  );

  router.post(
    "/home-showcase",
    requireAdmin,
    can("catalog.write"),
    requireShowcasePublishPermission,
    asyncRoute(async (req, res) => {
      const data = await services.homeShowcase.createSlide(req.body, req.adminViewer);
      res.status(201).json({ data, meta: withRequestId(req) });
    })
  );

  router.put(
    "/home-showcase/order",
    requireAdmin,
    can("catalog.write"),
    asyncRoute(async (req, res) => {
      const slides = await services.homeShowcase.reorderSlides(req.body, req.adminViewer);
      res.json({ data: { slides }, meta: withRequestId(req) });
    })
  );

  router.patch(
    "/home-showcase/:slideId",
    requireAdmin,
    can("catalog.write"),
    requireShowcasePublishPermission,
    asyncRoute(async (req, res) => {
      const data = await services.homeShowcase.updateSlide(
        req.params.slideId,
        req.body,
        req.adminViewer
      );
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.post(
    "/home-showcase/:slideId/image",
    requireAdmin,
    can("catalog.write"),
    imageUploadParser,
    asyncRoute(async (req, res) => {
      const data = await services.homeShowcase.uploadImage(
        req.params.slideId,
        {
          contentType: req.headers["content-type"] || "",
          body: req.body
        },
        req.adminViewer
      );
      res.status(201).json({ data, meta: withRequestId(req) });
    })
  );

  router.delete(
    "/home-showcase/:slideId",
    requireAdmin,
    can("catalog.write"),
    can("catalog.publish"),
    asyncRoute(async (req, res) => {
      const data = await services.homeShowcase.deleteSlide(req.params.slideId, req.adminViewer);
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.get(
    "/products/:productId",
    requireAdmin,
    can("catalog.read"),
    asyncRoute(async (req, res) => {
      const data = await services.products.getProduct(req.params.productId, req.adminViewer);
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.post(
    "/products/:productId/duplicate",
    requireAdmin,
    can("catalog.write"),
    asyncRoute(async (req, res) => {
      const data = await services.products.duplicateProduct(
        req.params.productId,
        req.body,
        req.adminViewer
      );
      res.status(201).json({ data, meta: withRequestId(req) });
    })
  );

  router.patch(
    "/products/:productId/visibility",
    requireAdmin,
    can("catalog.publish"),
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
    can("catalog.write"),
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
    can("catalog.write"),
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
    can("quotes.read"),
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
    can("quotes.write"),
    asyncRoute(async (req, res) => {
      const data = await services.quotes.createQuote(req.body, req.adminViewer);
      res.status(201).json({ data, meta: withRequestId(req) });
    })
  );

  router.get(
    "/quotes/:quoteId",
    requireAdmin,
    can("quotes.read"),
    asyncRoute(async (req, res) => {
      const data = await services.quotes.getQuoteById(req.params.quoteId, req.adminViewer);
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.patch(
    "/quotes/:quoteId",
    requireAdmin,
    can("quotes.write"),
    asyncRoute(async (req, res) => {
      const data = await services.quotes.updateQuote(req.params.quoteId, req.body, req.adminViewer);
      res.json({ data, meta: withRequestId(req) });
    })
  );

  router.post(
    "/quotes/:quoteId/issue",
    requireAdmin,
    can("quotes.write"),
    asyncRoute(async (req, res) => {
      const data = await services.quotes.issueQuote(req.params.quoteId, req.adminViewer);
      res.status(201).json({ data, meta: withRequestId(req) });
    })
  );

  router.get(
    "/quotes/:quoteId/documents/:documentId/pdf",
    requireAdmin,
    can("quotes.read"),
    asyncRoute(async (req, res, next) => {
      const document = await services.quotes.getQuoteDocument(
        req.params.quoteId,
        req.params.documentId,
        req.adminViewer
      );
      res.setHeader("content-type", "application/pdf");
      res.setHeader("cache-control", "private, no-store");
      res.setHeader("content-disposition", `attachment; filename="${document.filename.replace(/[^A-Za-z0-9._-]/g, "-")}"`);
      document.stream.on("error", next);
      document.stream.pipe(res);
    })
  );

  router.patch(
    "/quotes/:quoteId/status",
    requireAdmin,
    can("quotes.write"),
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
