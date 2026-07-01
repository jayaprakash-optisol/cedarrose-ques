import { subDays } from "date-fns";
import type { CaseRecord } from "@/types/case";
import type { CompletionStats, CompletionStatsCompanyBar, DashboardPeriod } from "@/types/dashboard";

const EXPIRED_CAP_DAYS = 10;
const DISPATCHED_STATUSES = new Set([
  "SENT",
  "OPENED",
  "IN PROGRESS",
  "COMPLETED",
  "COMPLETED — MISSING DATA",
  "EXPIRED",
]);
const IN_FLIGHT_STATUSES: readonly string[] = ["SENT", "OPENED", "IN PROGRESS"];

interface CaseTimingRow {
  caseId: string;
  subjectName: string;
  status: string;
  dateDispatched: Date;
  firstOpenedAt: Date | null;
  dateSubmitted: Date | null;
  companyName: string;
}

function periodWindow(period: DashboardPeriod) {
  const now = new Date();
  if (period === "7d") {
    return { currentSince: subDays(now, 7), previousSince: subDays(now, 14), previousUntil: subDays(now, 7) };
  }
  if (period === "30d") {
    return { currentSince: subDays(now, 30), previousSince: subDays(now, 60), previousUntil: subDays(now, 30) };
  }
  return {};
}

function caseToRow(c: CaseRecord): CaseTimingRow | null {
  if (!DISPATCHED_STATUSES.has(c.status)) return null;
  const dispatched = c.link.sentAt ?? c.requestedDate;
  if (!dispatched) return null;
  const submitted = c.status.startsWith("COMPLETED") ? c.lastActivity : null;
  return {
    caseId: c.id,
    subjectName: c.subjectName,
    status: c.status,
    dateDispatched: new Date(dispatched),
    firstOpenedAt: c.link.firstOpenedAt ? new Date(c.link.firstOpenedAt) : null,
    dateSubmitted: submitted ? new Date(submitted) : null,
    companyName: c.companyData?.companyName || c.subjectName,
  };
}

function msToHours(ms: number) {
  return ms / (1000 * 60 * 60);
}

function msToDays(ms: number) {
  return ms / (1000 * 60 * 60 * 24);
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function endTimestamp(row: CaseTimingRow, now: Date) {
  if (row.dateSubmitted) return row.dateSubmitted;
  return now;
}

function turnaroundDays(row: CaseTimingRow, now: Date) {
  if (row.status === "EXPIRED") return EXPIRED_CAP_DAYS;
  const days = msToDays(endTimestamp(row, now).getTime() - row.dateDispatched.getTime());
  return Math.max(0, Math.round(days * 10) / 10);
}

function completionDays(row: CaseTimingRow, now: Date) {
  if (!row.firstOpenedAt) return null;
  if (row.status === "EXPIRED") return EXPIRED_CAP_DAYS;
  const days = msToDays(endTimestamp(row, now).getTime() - row.firstOpenedAt.getTime());
  return Math.max(0, Math.round(days * 10) / 10);
}

function firstOpenHours(row: CaseTimingRow) {
  if (!row.firstOpenedAt) return null;
  return Math.max(0, Math.round(msToHours(row.firstOpenedAt.getTime() - row.dateDispatched.getTime()) * 10) / 10);
}

function shortCompanyName(name: string) {
  const first = name.trim().split(/\s+/)[0];
  return first.length > 14 ? `${first.slice(0, 12)}…` : first;
}

function displayStatus(status: string) {
  const map: Record<string, string> = {
    "IN PROGRESS": "In progress",
    COMPLETED: "Completed",
    "COMPLETED — MISSING DATA": "Completed",
    EXPIRED: "Expired",
    SENT: "Sent",
    OPENED: "Opened",
  };
  return map[status];
}

function formatEndLabel(row: CaseTimingRow) {
  if (row.dateSubmitted) {
    return row.dateSubmitted.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }
  if (row.status === "EXPIRED") {
    const expiredAt = new Date(row.dateDispatched.getTime() + EXPIRED_CAP_DAYS * 24 * 60 * 60 * 1000);
    return expiredAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }
  return "In progress";
}

function barState(days: number, status: string, overallAvg: number): CompletionStatsCompanyBar["state"] {
  if (status === "EXPIRED") return "expired";
  if (IN_FLIGHT_STATUSES.includes(status)) return "over-progress";
  return days <= overallAvg ? "under" : "over-progress";
}

function computeMetrics(rows: CaseTimingRow[], now: Date) {
  return {
    avgFirstOpenHours: average(rows.map(firstOpenHours).filter((v): v is number => v !== null)),
    avgCompleteDays: average(rows.map((r) => completionDays(r, now)).filter((v): v is number => v !== null)),
    avgTurnaroundDays: average(rows.map((r) => turnaroundDays(r, now))),
  };
}

function buildCompanyBars(rows: CaseTimingRow[], now: Date, overallAvg: number): CompletionStatsCompanyBar[] {
  const groups = new Map<string, { companyName: string; rows: CaseTimingRow[] }>();
  for (const row of rows) {
    const key = row.companyName;
    const group = groups.get(key);
    if (group) group.rows.push(row);
    else groups.set(key, { companyName: row.companyName, rows: [row] });
  }

  const bars: CompletionStatsCompanyBar[] = [];
  for (const group of groups.values()) {
    const dayValues = group.rows.map((r) => turnaroundDays(r, now));
    const avgDays = Math.round((dayValues.reduce((s, v) => s + v, 0) / dayValues.length) * 10) / 10;
    const dominant = group.rows.reduce<CaseTimingRow>(
      (best, row) => (turnaroundDays(row, now) >= turnaroundDays(best, now) ? row : best),
      group.rows[0],
    );

    bars.push({
      companyId: null,
      shortName: shortCompanyName(group.companyName),
      companyName: group.companyName,
      days: avgDays,
      state: barState(avgDays, dominant.status, overallAvg),
      status: displayStatus(dominant.status),
      dispatchedAt: dominant.dateDispatched.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      endAt: formatEndLabel(dominant),
      caseCount: group.rows.length,
    });
  }

  return bars.sort((a, b) => b.days - a.days).slice(0, 12);
}

export function computeCompletionStatsFromCases(cases: CaseRecord[], period: DashboardPeriod): CompletionStats {
  const now = new Date();
  const window = periodWindow(period);
  const allRows = cases.map(caseToRow).filter((r): r is CaseTimingRow => r !== null);
  const currentRows = window.currentSince
    ? allRows.filter((r) => r.dateDispatched >= window.currentSince!)
    : allRows;
  const previousRows =
    window.previousSince && window.previousUntil
      ? allRows.filter(
          (r) => r.dateDispatched >= window.previousSince! && r.dateDispatched < window.previousUntil!
        )
      : [];

  const current = computeMetrics(currentRows, now);
  const previous = computeMetrics(previousRows, now);
  const overallAvgDays = current.avgTurnaroundDays ?? 0;

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
    byCompany: buildCompanyBars(currentRows, now, overallAvgDays),
  };
}

export function formatCompletionMetricValue(value: number | null, unit: "hours" | "days"): string {
  if (value === null) return "—";
  if (unit === "hours") {
    if (value < 24) return `${Math.round(value)}h`;
    return `${(value / 24).toFixed(1)} days`;
  }
  return `${value.toFixed(1)} days`;
}

export function formatCompletionTrend(trend: number | null, unit: "hours" | "days"): string {
  if (trend === null) return "No prior period data";
  if (trend === 0) return "No change vs previous period";
  const symbol = trend < 0 ? "↓" : "↑";
  const suffix = unit === "hours" ? "h" : "d";
  return `${symbol} ${Math.abs(trend)}${suffix} vs previous period`;
}

export function trendIsNegative(trend: number | null): boolean {
  return trend !== null && trend < 0;
}
