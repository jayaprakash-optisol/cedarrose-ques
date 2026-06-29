import type { Request, Response } from "express";
import type { DashboardService, DashboardPeriod } from "./dashboard.service.js";
import { sendSuccess } from "../../shared/utils/response.js";
import { AppError } from "../../shared/errors/AppError.js";

const PERIODS = new Set<DashboardPeriod>(["7d", "30d", "all"]);

export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  completionStats = async (req: Request, res: Response) => {
    const period = (req.query.period as string) ?? "30d";
    if (!PERIODS.has(period as DashboardPeriod)) {
      throw new AppError(400, "VALIDATION_ERROR", "period must be 7d, 30d, or all");
    }

    const data = await this.dashboardService.getCompletionStats(period as DashboardPeriod);
    sendSuccess(res, data);
  };
}
