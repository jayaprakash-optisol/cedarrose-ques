import { Router } from "express";
import type { CompanyRequestsController } from "./company-requests.controller.js";
import { validate } from "../../middleware/validate.js";
import { webhookCompanyRequestSchema } from "./company-requests.schema.js";

export function companyRequestsWebhookRouter(controller: CompanyRequestsController): Router {
  const router = Router();
  router.post("/", validate(webhookCompanyRequestSchema), controller.receive);
  return router;
}
