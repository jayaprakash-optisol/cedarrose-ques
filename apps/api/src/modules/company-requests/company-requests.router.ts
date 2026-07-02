import { Router } from "express";
import type { CompanyRequestsController } from "./company-requests.controller.js";

export function companyRequestsRouter(controller: CompanyRequestsController): Router {
  const router = Router();
  router.get("/", controller.list);
  router.get("/:id", controller.getById);
  return router;
}
