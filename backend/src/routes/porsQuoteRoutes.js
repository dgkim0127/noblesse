import { Router } from "express";

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function createPorsQuoteRoutes({
  posService,
  requirePorsQuoteRead,
  requirePorsQuoteWrite
}) {
  const router = Router();

  router.get(
    "/quotes",
    requirePorsQuoteRead,
    asyncRoute(async (req, res) => {
      const result = await posService.listQuotes(req.query, req.porsQuoteViewer);
      res.json({ quotes: result.quotes, meta: result.meta || {} });
    })
  );

  router.get(
    "/quotes/:quoteId",
    requirePorsQuoteRead,
    asyncRoute(async (req, res) => {
      const detail = await posService.getQuoteById(
        req.params.quoteId,
        req.porsQuoteViewer
      );
      res.json(detail);
    })
  );

  router.put(
    "/quotes/:quoteId/picking",
    requirePorsQuoteWrite,
    asyncRoute(async (req, res) => {
      const data = await posService.savePicking(
        req.params.quoteId,
        req.body,
        req.porsQuoteViewer
      );
      res.json(data);
    })
  );

  router.post(
    "/quotes/:quoteId/price-preview",
    requirePorsQuoteWrite,
    asyncRoute(async (req, res) => {
      const data = await posService.previewPrice(
        req.params.quoteId,
        req.body,
        req.porsQuoteViewer
      );
      res.json(data);
    })
  );

  router.post(
    "/quotes/:quoteId/finalize",
    requirePorsQuoteWrite,
    asyncRoute(async (req, res) => {
      const data = await posService.finalizeQuote(
        req.params.quoteId,
        req.body,
        req.porsQuoteViewer
      );
      res.status(201).json(data);
    })
  );

  router.post(
    "/quotes/:quoteId/publish",
    requirePorsQuoteWrite,
    asyncRoute(async (req, res) => {
      const data = await posService.publishQuote(
        req.params.quoteId,
        req.body,
        req.porsQuoteViewer
      );
      res.status(201).json(data);
    })
  );

  router.post(
    "/quotes/:quoteId/receipt-link",
    requirePorsQuoteWrite,
    asyncRoute(async (req, res) => {
      const data = await posService.linkReceipt(
        req.params.quoteId,
        req.body,
        req.porsQuoteViewer
      );
      res.json(data);
    })
  );

  return router;
}
