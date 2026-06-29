import { Router } from "express";
import type { NotificationsController } from "./notifications.controller.js";

export function notificationsRouter(controller: NotificationsController): Router {
  const router = Router();
  router.get("/", controller.list);
  router.patch("/read-all", controller.markAllRead);
  router.patch("/:id/read", controller.markRead);
  router.delete("/:id", controller.delete);
  return router;
}
