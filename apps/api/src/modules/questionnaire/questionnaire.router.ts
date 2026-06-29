import { Router } from "express";
import type { QuestionnaireController } from "./questionnaire.controller.js";
import { validate } from "../../middleware/validate.js";
import {
  verifyLinkSchema,
  authenticateSchema,
  otpVerifySchema,
  saveProgressSchema,
} from "./questionnaire.schema.js";
import { questionnaireAuthLimit } from "../../middleware/rate-limit.js";

export function questionnaireRouter(controller: QuestionnaireController): Router {
  const router = Router();
  router.post("/verify-link", validate(verifyLinkSchema), controller.verifyLink);
  router.post(
    "/authenticate",
    questionnaireAuthLimit,
    validate(authenticateSchema),
    controller.authenticate
  );
  router.post(
    "/otp-verify",
    questionnaireAuthLimit,
    validate(otpVerifySchema),
    controller.otpVerify
  );
  router.get("/:token/form", controller.getForm);
  router.post("/:token/save", validate(saveProgressSchema), controller.save);
  router.post("/:token/submit", controller.submit);
  return router;
}
