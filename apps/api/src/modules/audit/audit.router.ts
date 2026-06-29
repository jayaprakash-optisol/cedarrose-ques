import { Router } from "express";
import type { AuditController } from "./audit.controller.js";
import { authorize } from "../../middleware/authorize.js";

export function auditRouter(controller: AuditController): Router {
  const router = Router();
  router.get("/", authorize("Admin"), controller.list);
  router.get("/export", authorize("Admin"), controller.exportCsv);
  return router;
}
