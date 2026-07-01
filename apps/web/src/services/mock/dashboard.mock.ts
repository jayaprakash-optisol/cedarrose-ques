import type { DashboardPeriod, CompletionStats } from "@/types/dashboard";
import { mockCasesService } from "./cases.mock";
import { computeCompletionStatsFromCases } from "@/lib/completion-stats";
import { delay } from "./utils";

export interface DashboardService {
  getCompletionStats(period: DashboardPeriod): Promise<CompletionStats>;
}

export const mockDashboardService: DashboardService = {
  async getCompletionStats(period) {
    await delay(200);
    const { data: cases } = await mockCasesService.list({ limit: 1000 });
    return computeCompletionStatsFromCases(cases, period);
  },
};
