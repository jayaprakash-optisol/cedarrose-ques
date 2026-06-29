import { Router } from "express";
import type { CompaniesController } from "./companies.controller.js";
import { validate } from "../../middleware/validate.js";
import { createCompanySchema, updateCompanySchema } from "./companies.schema.js";
import { authorize } from "../../middleware/authorize.js";

export function companiesRouter(controller: CompaniesController): Router {
  const router = Router();
  router.get("/:uid", controller.getByUid);
  router.get("/", authorize("Admin"), controller.list);
  router.post("/", authorize("Admin"), validate(createCompanySchema), controller.create);
  router.patch("/:uid", authorize("Admin"), validate(updateCompanySchema), controller.update);
  return router;
}
