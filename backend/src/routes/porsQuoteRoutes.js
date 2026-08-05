import { Router } from "express";

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function createPorsQuoteRoutes({ posService, requirePorsQuoteRead }) {
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

  return router;
}
