import { randomUUID } from "node:crypto";

export function requestId(req, res, next) {
  const incoming = req.get("x-request-id");
  req.id = incoming || randomUUID();
  res.setHeader("x-request-id", req.id);
  next();
}
