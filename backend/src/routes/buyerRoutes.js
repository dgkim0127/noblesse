import { Router } from "express";

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function createBuyerRoutes({
  buyerRegistrationService,
  buyerService,
  buyerInquiryService,
  buyerQuoteService,
  requireFirebaseIdentity,
  requireUser
}) {
  const router = Router();

  router.post(
    "/register",
    requireFirebaseIdentity,
    asyncRoute(async (req, res) => {
      const profile = await buyerRegistrationService.registerBuyer(
        req.firebaseIdentity,
        req.body,
        {
          ipAddress: req.ip,
          userAgent: req.get("user-agent") || null,
          requestId: req.id
        }
      );
      res.status(201).json({
        data: { profile },
        meta: { requestId: req.id }
      });
    })
  );

  router.get(
    "/me",
    requireUser,
    asyncRoute(async (req, res) => {
      const profile = await buyerService.getMe(req.viewer);
      res.json({ profile });
    })
  );

  router.get(
    "/product-prices",
    requireUser,
    asyncRoute(async (req, res) => {
      const productPrices = await buyerInquiryService.listProductPrices(req.viewer);
      res.json({ productPrices });
    })
  );

  router.get(
    "/inquiries",
    requireUser,
    asyncRoute(async (req, res) => {
      const result = await buyerInquiryService.listInquiries(req.query, req.viewer);
      res.json({
        data: { inquiries: result.inquiries },
        meta: { ...result.meta, requestId: req.id }
      });
    })
  );

  router.post(
    "/inquiries",
    requireUser,
    asyncRoute(async (req, res) => {
      const inquiry = await buyerInquiryService.createInquiry(req.body, req.viewer);
      res.status(201).json({
        data: { inquiry },
        meta: { requestId: req.id }
      });
    })
  );

  router.get(
    "/inquiries/:inquiryId",
    requireUser,
    asyncRoute(async (req, res) => {
      const inquiry = await buyerInquiryService.getInquiryById(req.params.inquiryId, req.viewer);
      res.json({
        data: { inquiry },
        meta: { requestId: req.id }
      });
    })
  );

  router.get(
    "/inquiries/:inquiryId/quote",
    requireUser,
    asyncRoute(async (req, res) => {
      const quote = await buyerQuoteService.getQuoteForInquiry(req.params.inquiryId, req.viewer);
      res.json({ data: { quote }, meta: { requestId: req.id } });
    })
  );

  router.get(
    "/quotes/:quoteId/documents/:documentId/pdf",
    requireUser,
    asyncRoute(async (req, res, next) => {
      const document = await buyerQuoteService.getQuoteDocument(
        req.params.quoteId,
        req.params.documentId,
        req.viewer
      );
      res.setHeader("content-type", "application/pdf");
      res.setHeader("cache-control", "private, no-store");
      res.setHeader("content-disposition", `attachment; filename="${document.filename.replace(/[^A-Za-z0-9._-]/g, "-")}"`);
      document.stream.on("error", next);
      document.stream.pipe(res);
    })
  );

  router.post(
    "/quotes/:quoteId/decision",
    requireUser,
    asyncRoute(async (req, res) => {
      const data = await buyerQuoteService.decideQuote(req.params.quoteId, req.body, req.viewer);
      res.json({ data, meta: { requestId: req.id } });
    })
  );

  return router;
}
