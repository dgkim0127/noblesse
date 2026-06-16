import { Router } from "express";
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

export function createAdminRoutes({ services, requireAdmin }) {
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

  router.all("/inquiries/:inquiryId/status", () => {
    throw notFound("Admin status route is not implemented");
  });
  router.all("/quotes", () => {
    throw notFound("Admin quote route is not implemented");
  });
  router.delete("*", () => {
    throw notFound("Admin delete routes are not implemented");
  });

  return router;
}
