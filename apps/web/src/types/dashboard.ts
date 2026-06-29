export type DashboardPeriod = "7d" | "30d" | "all";

export interface CompletionStatsMetric {
  value: number | null;
  unit: "hours" | "days";
  trend: number | null;
  trendUnit: "hours" | "days";
}

export interface CompletionStatsCompanyBar {
  companyId: string | null;
  shortName: string;
  companyName: string;
  days: number;
  state: "under" | "over-progress" | "expired";
  status: string;
  dispatchedAt: string;
  endAt: string;
  caseCount: number;
}

export interface CompletionStats {
  period: DashboardPeriod;
  caseCount: number;
  expiredCapDays: number;
  includesInProgress: boolean;
  summary: {
    avgTimeToFirstOpen: CompletionStatsMetric;
    avgTimeToComplete: CompletionStatsMetric;
    avgTotalTurnaround: CompletionStatsMetric;
  };
  overallAvgDays: number;
  byCompany: CompletionStatsCompanyBar[];
}
