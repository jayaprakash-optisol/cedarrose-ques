import { Router } from "express";
import type { UsersController } from "./users.controller.js";
import { validate } from "../../middleware/validate.js";
import { inviteUserSchema, updateUserSchema } from "./users.schema.js";
import { emailActionLimit } from "../../middleware/rate-limit.js";

export function usersRouter(controller: UsersController): Router {
  const router = Router();
  router.get("/", controller.list);
  router.post("/invite", emailActionLimit, validate(inviteUserSchema), controller.invite);
  router.patch("/:id", validate(updateUserSchema), controller.update);
  router.delete("/:id", controller.deactivate);
  router.post("/:id/resend-invitation", emailActionLimit, controller.resendInvitation);
  router.delete("/:id/invitations", controller.cancelInvitation);
  router.get("/export", controller.exportCsv);
  return router;
}
