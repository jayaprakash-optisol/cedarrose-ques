import { Router } from "express";
import type { CasesController } from "./cases.controller.js";
import { validate } from "../../middleware/validate.js";
import { createCaseSchema, researcherReviewSchema } from "./cases.schema.js";
import { authorize } from "../../middleware/authorize.js";

export function casesRouter(controller: CasesController): Router {
  const router = Router();
  router.get("/export", authorize("Admin", "Analyst"), controller.exportCsv);
  router.get("/", controller.list);
  router.get("/:id", controller.getById);
  router.post("/", validate(createCaseSchema), controller.create);
  router.patch("/:id/resend-link", controller.resendLink);
  router.patch(
    "/:id/researcher-review",
    authorize("Researcher", "Admin"),
    validate(researcherReviewSchema),
    controller.researcherReview
  );
  router.patch("/:id/api-push", authorize("Admin"), controller.apiPush);
  return router;
}
