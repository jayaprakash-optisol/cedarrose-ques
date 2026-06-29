import { Router } from "express";
import type { ConfigController } from "./config.controller.js";
import { validate } from "../../middleware/validate.js";
import { replaceConfigSchema } from "./config.schema.js";

export function configRouter(controller: ConfigController): Router {
  const router = Router();
  router.get("/", controller.get);
  router.put("/", validate(replaceConfigSchema), controller.replace);
  return router;
}
