import { Router } from "express";

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function createAuthRoutes({ loginIdentifierService }) {
  const router = Router();

  router.post(
    "/resolve-login-identifier",
    asyncRoute(async (req, res) => {
      const data = await loginIdentifierService.resolveIdentifier(req.body || {});
      res.set("cache-control", "no-store");
      res.json({
        data,
        meta: { requestId: req.id }
      });
    })
  );

  return router;
}
