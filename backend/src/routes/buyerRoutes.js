import { Router } from "express";

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function createBuyerRoutes({ buyerService, requireUser }) {
  const router = Router();

  router.get(
    "/me",
    requireUser,
    asyncRoute(async (req, res) => {
      const profile = await buyerService.getMe(req.viewer);
      res.json({ profile });
    })
  );

  return router;
}
