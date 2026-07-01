import { subDays } from "date-fns";
import type { DashboardRepository, DashboardCaseRow } from "./dashboard.repository.js";

export const EXPIRED_CAP_DAYS = 10;

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

export interface CompletionStatsResponse {
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

function periodWindow(period: DashboardPeriod): { currentSince?: Date; previousSince?: Date; previousUntil?: Date } {
  const now = new Date();
  if (period === "7d") {
    return {
      currentSince: subDays(now, 7),
      previousSince: subDays(now, 14),
      previousUntil: subDays(now, 7),
    };
  }
  if (period === "30d") {
    return {
      currentSince: subDays(now, 30),
      previousSince: subDays(now, 60),
      previousUntil: subDays(now, 30),
    };
  }
  return {};
}

function msToHours(ms: number): number {
  return ms / (1000 * 60 * 60);
}

function msToDays(ms: number): number {
  return ms / (1000 * 60 * 60 * 24);
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function shortCompanyName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? name;
  return first.length > 14 ? `${first.slice(0, 12)}…` : first;
}

function displayStatus(status: string): string {
  const map: Record<string, string> = {
    "IN PROGRESS": "In progress",
    COMPLETED: "Completed",
    "COMPLETED — MISSING DATA": "Completed",
    EXPIRED: "Expired",
    SENT: "Sent",
    OPENED: "Opened",
  };
  return map[status] ?? status;
}

function endTimestamp(row: DashboardCaseRow, now: Date): Date {
  if (row.status === "EXPIRED" && row.dateDispatched) {
    return new Date(row.dateDispatched.getTime() + EXPIRED_CAP_DAYS * 24 * 60 * 60 * 1000);
  }
  if (row.dateSubmitted) return row.dateSubmitted;
  return now;
}

function turnaroundDays(row: DashboardCaseRow, now: Date): number | null {
  if (!row.dateDispatched) return null;
  const end = endTimestamp(row, now);
  const days = msToDays(end.getTime() - row.dateDispatched.getTime());
  if (row.status === "EXPIRED") return EXPIRED_CAP_DAYS;
  return Math.max(0, Math.round(days * 10) / 10);
}

function completionDays(row: DashboardCaseRow, now: Date): number | null {
  if (!row.firstOpenedAt) return null;
  const end = endTimestamp(row, now);
  const days = msToDays(end.getTime() - row.firstOpenedAt.getTime());
  if (row.status === "EXPIRED") return EXPIRED_CAP_DAYS;
  return Math.max(0, Math.round(days * 10) / 10);
}

function firstOpenHours(row: DashboardCaseRow): number | null {
  if (!row.dateDispatched || !row.firstOpenedAt) return null;
  return Math.max(0, Math.round(msToHours(row.firstOpenedAt.getTime() - row.dateDispatched.getTime()) * 10) / 10);
}

function barState(days: number, status: string, overallAvg: number): CompletionStatsCompanyBar["state"] {
  if (status === "EXPIRED") return "expired";
  if (["SENT", "OPENED", "IN PROGRESS"].includes(status)) return "over-progress";
  return days <= overallAvg ? "under" : "over-progress";
}

function formatEndLabel(row: DashboardCaseRow, now: Date): string {
  if (row.dateSubmitted) {
    return row.dateSubmitted.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }
  if (row.status === "EXPIRED" && row.dateDispatched) {
    const expiredAt = new Date(row.dateDispatched.getTime() + EXPIRED_CAP_DAYS * 24 * 60 * 60 * 1000);
    return expiredAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }
  if (["SENT", "OPENED", "IN PROGRESS"].includes(row.status)) return "In progress";
  return now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function computeMetrics(rows: DashboardCaseRow[], now: Date) {
  const firstOpenHoursList = rows.map(firstOpenHours).filter((v): v is number => v !== null);
  const completeDaysList = rows.map((r) => completionDays(r, now)).filter((v): v is number => v !== null);
  const turnaroundDaysList = rows.map((r) => turnaroundDays(r, now)).filter((v): v is number => v !== null);

  return {
    avgFirstOpenHours: average(firstOpenHoursList),
    avgCompleteDays: average(completeDaysList),
    avgTurnaroundDays: average(turnaroundDaysList),
  };
}

function buildCompanyBars(rows: DashboardCaseRow[], now: Date, overallAvg: number): CompletionStatsCompanyBar[] {
  const groups = new Map<
    string,
    { companyId: string | null; companyName: string; rows: DashboardCaseRow[] }
  >();

  for (const row of rows) {
    const key = row.companyId ?? `subject:${row.subjectName}`;
    const companyName = row.companyName ?? row.subjectName;
    const existing = groups.get(key);
    if (existing) {
      existing.rows.push(row);
    } else {
      groups.set(key, { companyId: row.companyId, companyName, rows: [row] });
    }
  }

  const bars: CompletionStatsCompanyBar[] = [];

  for (const group of groups.values()) {
    const dayValues = group.rows
      .map((r) => turnaroundDays(r, now))
      .filter((v): v is number => v !== null);
    if (!dayValues.length) continue;

    const avgDays = Math.round((dayValues.reduce((s, v) => s + v, 0) / dayValues.length) * 10) / 10;
    const dominant = group.rows.reduce((best, row) => {
      const days = turnaroundDays(row, now) ?? 0;
      const bestDays = turnaroundDays(best, now) ?? 0;
      return days >= bestDays ? row : best;
    }, group.rows[0]);

    const dispatchedAt = dominant.dateDispatched!;
    bars.push({
      companyId: group.companyId,
      shortName: shortCompanyName(group.companyName),
      companyName: group.companyName,
      days: avgDays,
      state: barState(avgDays, dominant.status, overallAvg),
      status: displayStatus(dominant.status),
      dispatchedAt: dispatchedAt.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      endAt: formatEndLabel(dominant, now),
      caseCount: group.rows.length,
    });
  }

  return bars.toSorted((a, b) => b.days - a.days).slice(0, 12);
}

export class DashboardService {
  constructor(private readonly dashboardRepo: DashboardRepository) {}

  async getCompletionStats(period: DashboardPeriod): Promise<CompletionStatsResponse> {
    const now = new Date();
    const window = periodWindow(period);

    const allRows = await this.dashboardRepo.findCasesForStats(window.currentSince);
    const currentRows = window.currentSince
      ? allRows.filter((r) => r.dateDispatched && r.dateDispatched >= window.currentSince!)
      : allRows;

    let previousRows: DashboardCaseRow[] = [];
    if (window.previousSince && window.previousUntil) {
      const prevAll = await this.dashboardRepo.findCasesForStats(window.previousSince);
      previousRows = prevAll.filter(
        (r) =>
          r.dateDispatched &&
          r.dateDispatched >= window.previousSince! &&
          r.dateDispatched < window.previousUntil!
      );
    }

    const current = computeMetrics(currentRows, now);
    const previous = computeMetrics(previousRows, now);
    const overallAvgDays = current.avgTurnaroundDays ?? 0;
    const byCompany = buildCompanyBars(currentRows, now, overallAvgDays);

    return {
      period,
      caseCount: currentRows.length,
      expiredCapDays: EXPIRED_CAP_DAYS,
      includesInProgress: true,
      summary: {
        avgTimeToFirstOpen: {
          value: current.avgFirstOpenHours,
          unit: "hours",
          trend:
            current.avgFirstOpenHours !== null && previous.avgFirstOpenHours !== null
              ? Math.round((current.avgFirstOpenHours - previous.avgFirstOpenHours) * 10) / 10
              : null,
          trendUnit: "hours",
        },
        avgTimeToComplete: {
          value: current.avgCompleteDays,
          unit: "days",
          trend:
            current.avgCompleteDays !== null && previous.avgCompleteDays !== null
              ? Math.round((current.avgCompleteDays - previous.avgCompleteDays) * 10) / 10
              : null,
          trendUnit: "days",
        },
        avgTotalTurnaround: {
          value: current.avgTurnaroundDays,
          unit: "days",
          trend:
            current.avgTurnaroundDays !== null && previous.avgTurnaroundDays !== null
              ? Math.round((current.avgTurnaroundDays - previous.avgTurnaroundDays) * 10) / 10
              : null,
          trendUnit: "days",
        },
      },
      overallAvgDays: Math.round(overallAvgDays * 10) / 10,
      byCompany,
    };
  }
}
