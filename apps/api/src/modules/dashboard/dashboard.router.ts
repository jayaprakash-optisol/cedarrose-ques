import { Router } from "express";
import type { DashboardController } from "./dashboard.controller.js";

export function dashboardRouter(controller: DashboardController) {
  const router = Router();
  router.get("/completion-stats", controller.completionStats);
  return router;
}
