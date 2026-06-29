import { Router } from "express";
import type { TemplatesController } from "./templates.controller.js";
import { validate } from "../../middleware/validate.js";
import {
  createTemplateSchema,
  replaceTemplateSchema,
  updateTemplateStatusSchema,
} from "./templates.schema.js";

export function templatesRouter(controller: TemplatesController): Router {
  const router = Router();
  router.get("/", controller.list);
  router.get("/:id", controller.getById);
  router.post("/", validate(createTemplateSchema), controller.create);
  router.put("/:id", validate(replaceTemplateSchema), controller.replace);
  router.patch("/:id/status", validate(updateTemplateStatusSchema), controller.updateStatus);
  router.delete("/:id", controller.delete);
  return router;
}
