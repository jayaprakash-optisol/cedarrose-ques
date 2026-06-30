import { Router } from "express";
import type { AuthController } from "./auth.controller.js";
import { validate } from "../../middleware/validate.js";
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  completeRegistrationSchema,
} from "./auth.schema.js";
import {
  authLoginLimit,
  authRefreshLimit,
  authPasswordResetLimit,
  authRegistrationLimit,
  authChangePasswordLimit,
  cookieTokenExtractor,
} from "../../middleware/rate-limit.js";
import { authenticate } from "../../middleware/authenticate.js";
import { passwordPolicyMiddleware } from "../../middleware/passwordPolicy.js";

export function authRouter(controller: AuthController): Router {
  const router = Router();

  router.post("/login", authLoginLimit, validate(loginSchema), controller.login);
  router.post("/refresh", authRefreshLimit, controller.refreshToken);
  router.post("/logout", controller.logout);
  router.get("/me", cookieTokenExtractor, authenticate, controller.me);
  router.post(
    "/change-password",
    authChangePasswordLimit,
    cookieTokenExtractor,
    authenticate,
    passwordPolicyMiddleware,
    validate(changePasswordSchema),
    controller.changePassword
  );
  router.post("/forgot-password", authPasswordResetLimit, validate(forgotPasswordSchema), controller.forgotPassword);
  router.post(
    "/reset-password",
    authPasswordResetLimit,
    passwordPolicyMiddleware,
    validate(resetPasswordSchema),
    controller.resetPassword
  );
  router.get("/verify-invitation", authRegistrationLimit, controller.verifyInvitation);
  router.get("/verify-reset-token", authPasswordResetLimit, controller.verifyResetToken);
  router.post(
    "/complete-registration",
    authRegistrationLimit,
    passwordPolicyMiddleware,
    validate(completeRegistrationSchema),
    controller.completeRegistration
  );

  return router;
}
