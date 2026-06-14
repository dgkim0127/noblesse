import { Router } from "express";

export function createHealthRoutes() {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({
      ok: true,
      service: "noblesse-backend",
      version: "phase1"
    });
  });

  return router;
}
