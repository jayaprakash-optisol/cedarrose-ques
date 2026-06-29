import { Router } from "express";
import type { UsersController } from "./users.controller.js";
import { validate } from "../../middleware/validate.js";
import { inviteUserSchema, updateUserSchema } from "./users.schema.js";

export function usersRouter(controller: UsersController): Router {
  const router = Router();
  router.get("/", controller.list);
  router.post("/invite", validate(inviteUserSchema), controller.invite);
  router.patch("/:id", validate(updateUserSchema), controller.update);
  router.delete("/:id", controller.deactivate);
  router.post("/:id/resend-invitation", controller.resendInvitation);
  router.delete("/:id/invitations", controller.cancelInvitation);
  router.get("/export", controller.exportCsv);
  return router;
}
