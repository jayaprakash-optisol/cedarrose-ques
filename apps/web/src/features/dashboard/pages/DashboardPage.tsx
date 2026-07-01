import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { CaseRecord, CaseStatus } from "@/types/case";
import type { DashboardPeriod } from "@/types/dashboard";
import { casesService, dashboardService } from "@/services";
import {
  formatCompletionMetricValue,
  formatCompletionTrend,
  trendIsNegative,
} from "@/lib/completion-stats";
import { MetricCard } from "@/components/common/MetricCard";
import { AppShell } from "@/components/layout/AppShell";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
} from "recharts";
import { isStale } from "@/lib/format";


export default function OverviewPage() {
  const { data: casesResult } = useQuery({
    queryKey: ["cases", "dashboard-summary"],
    queryFn: () => casesService.list({ page: 1, limit: 100 }),
    refetchInterval: 30_000,
  });
  const cases = casesResult?.data ?? [];

  const total = cases.length;
  const completed = cases.filter((c) => c.status === "COMPLETED").length;
  const inProgress = cases.filter((c) => c.status === "IN PROGRESS").length;
  const needsAttention = cases.filter(
    (c) => c.status === "EXPIRED" || c.status === "COMPLETED — MISSING DATA" ||
      c.status === "PENDING CONTACT" || c.status === "PENDING LINKAGE & CONTACT" ||
      (c.status === "IN PROGRESS" && isStale(c.lastActivity, 72))
  ).length;

  const byType = (["Supplier", "Customer", "Partner"] as const).map((t) => {
    const items = cases.filter((c) => c.recipientType === t);
    const avg = items.length
      ? Math.round(items.reduce((s, c) => s + (c.completionMandatory.done / c.completionMandatory.total) * 100, 0) / items.length)
      : 0;
    return { type: t, value: avg };
  });
  const TYPE_COLOR = { Supplier: "var(--navy)", Customer: "oklch(0.62 0.10 200)", Partner: "oklch(0.75 0.15 75)" } as const;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Overview</h2>
            <p className="text-sm text-muted-foreground">Live view of questionnaire operations across all active cases.</p>
          </div>
          <Link
            to="/new-request"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-navy hover:bg-navy/90 text-white text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> New Request
          </Link>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Total active cases" value={total} tone="navy" />
          <MetricCard label="Completed" value={completed} tone="green" />
          <MetricCard label="In progress" value={inProgress} tone="amber" />
          <MetricCard label="Needs attention" value={needsAttention} tone="red" hint="Resend link, pending contact, etc." />
        </div>

        {/* Row 1 — Response trends + Status breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResponseTrends />
          <StatusBreakdown cases={cases} />
        </div>

        {/* Row 2 — Completion rate by type + Average completion time */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Completion rate by recipient type</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byType} layout="vertical" margin={{ left: 8, right: 32, top: 8, bottom: 8 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis type="category" dataKey="type" axisLine={false} tickLine={false} width={80} tick={{ fontSize: 12 }} />
                  <RTooltip cursor={{ fill: "var(--secondary)" }} formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={28} label={{ position: "right", formatter: (v: number) => `${v}%`, fontSize: 12 }}>
                    {byType.map((d) => <Cell key={d.type} fill={TYPE_COLOR[d.type]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <AverageCompletionTime />
        </div>
      </div>
    </AppShell>
  );
}

function ResponseTrends() {
  const [range, setRange] = useState<"7d" | "30d" | "all">("30d");
  const ranges = [
    { id: "7d" as const, label: "7 days", days: 7 },
    { id: "30d" as const, label: "30 days", days: 30 },
    { id: "all" as const, label: "All time", days: 90 },
  ];
  const selected = ranges.find((r) => r.id === range)!;

  const data = useMemo(() => {
    const out: { date: string; Dispatched: number; Submitted: number }[] = [];
    const today = new Date();
    for (let i = selected.days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const seed = (d.getDate() * 13 + d.getMonth() * 7) % 17;
      const dispatched = 6 + (seed % 8);
      const submitted = Math.max(1, dispatched - 2 - (seed % 4));
      out.push({
        date: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        Dispatched: dispatched,
        Submitted: submitted,
      });
    }
    return out;
  }, [selected.days]);

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold">Response trends</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Questionnaires dispatched vs submitted</p>
        </div>
        <div className="inline-flex rounded-full border border-border bg-secondary p-0.5 text-xs">
          {ranges.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={[
                "px-2.5 py-1 rounded-full transition-colors",
                range === r.id ? "bg-card text-navy font-medium shadow-sm" : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >{r.label}</button>
          ))}
        </div>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(data.length / 7))} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <RTooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="Dispatched" stroke="#2B3178" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Submitted" stroke="#38A169" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<CaseStatus, string> = {
  "COMPLETED": "#3B6D11",
  "COMPLETED — MISSING DATA": "#854F0B",
  "IN PROGRESS": "#185FA5",
  "SENT": "#2B3178",
  "OPENED": "#0E7490",
  "EXPIRED": "#A32D2D",
  "PENDING CONTACT": "#D97706",
  "PENDING LINKAGE & CONTACT": "#B45309",
  "NOT SENT": "#718096",
};

function StatusBreakdown({ cases }: { cases: CaseRecord[] }) {
  const ORDER: CaseStatus[] = [
    "COMPLETED", "IN PROGRESS", "SENT", "OPENED", "EXPIRED",
    "PENDING CONTACT", "PENDING LINKAGE & CONTACT", "NOT SENT",
  ];
  const data = ORDER.map((s) => ({
    name: s,
    value: cases.filter((c) => c.status === s).length,
    color: STATUS_COLORS[s],
  })).filter((d) => d.value > 0);

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="text-sm font-semibold mb-1">Status breakdown</h3>
      <p className="text-xs text-muted-foreground mb-3">Distribution of active cases by status</p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
              {data.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <RTooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs mt-2">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
            <span className="text-foreground truncate flex-1">{d.name}</span>
            <span className="text-muted-foreground tabular-nums">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AverageCompletionTime() {
  const [range, setRange] = useState<DashboardPeriod>("30d");
  const ranges: { id: DashboardPeriod; label: string }[] = [
    { id: "7d", label: "7 days" },
    { id: "30d", label: "30 days" },
    { id: "all", label: "All time" },
  ];

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", "completion-stats", range],
    queryFn: () => dashboardService.getCompletionStats(range),
    refetchInterval: 60_000,
  });

  const chartMax = Math.max(12, data?.overallAvgDays ?? 0, ...(data?.byCompany.map((b) => b.days) ?? [0]));

  const summary = data
    ? [
        {
          label: "Avg. time to first open",
          value: formatCompletionMetricValue(data.summary.avgTimeToFirstOpen.value, "hours"),
          sub: "from dispatch to link click",
          trend: formatCompletionTrend(data.summary.avgTimeToFirstOpen.trend, "hours"),
          trendUp: !trendIsNegative(data.summary.avgTimeToFirstOpen.trend) && data.summary.avgTimeToFirstOpen.trend !== 0,
        },
        {
          label: "Avg. time to complete",
          value: formatCompletionMetricValue(data.summary.avgTimeToComplete.value, "days"),
          sub: "from first open to submission",
          trend: formatCompletionTrend(data.summary.avgTimeToComplete.trend, "days"),
          trendUp: !trendIsNegative(data.summary.avgTimeToComplete.trend) && data.summary.avgTimeToComplete.trend !== 0,
        },
        {
          label: "Avg. total turnaround",
          value: formatCompletionMetricValue(data.summary.avgTotalTurnaround.value, "days"),
          sub: "from dispatch to submission",
          trend: formatCompletionTrend(data.summary.avgTotalTurnaround.trend, "days"),
          trendUp: !trendIsNegative(data.summary.avgTotalTurnaround.trend) && data.summary.avgTotalTurnaround.trend !== 0,
        },
      ]
    : [];

  const bars = data?.byCompany ?? [];
  const avg = data?.overallAvgDays ?? 0;

  const colorFor = (s: string) =>
    s === "under" ? "bg-status-completed-fg" :
    s === "expired" ? "bg-status-abandoned-fg" : "bg-status-pending-fg";
  const bgFor = (s: string) =>
    s === "under" ? "bg-status-completed-bg" :
    s === "expired" ? "bg-status-abandoned-bg" : "bg-status-pending-bg";

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Average completion time</h3>
          <p className="text-xs text-muted-foreground mt-0.5">How long subjects take to complete and submit</p>
        </div>
        <div className="inline-flex rounded-full border border-border bg-secondary p-0.5 text-xs">
          {ranges.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={[
                "px-2.5 py-1 rounded-full transition-colors",
                range === r.id ? "bg-card text-navy font-medium shadow-sm" : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >{r.label}</button>
          ))}
        </div>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading completion stats…</p>
      )}
      {isError && (
        <p className="text-sm text-status-abandoned-fg py-8 text-center">Could not load completion stats.</p>
      )}

      {!isLoading && !isError && data && (
        <>
      <div className="grid grid-cols-3 gap-2">
        {summary.map((m) => (
          <div key={m.label} className="rounded-md bg-secondary border border-border px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium leading-tight">{m.label}</div>
            <div className="text-xl font-semibold text-navy mt-1 tabular-nums">{m.value}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{m.sub}</div>
            <div className={["text-[10px] mt-1 font-medium", m.trendUp ? "text-status-abandoned-fg" : "text-status-completed-fg"].join(" ")}>
              {m.trend}
            </div>
          </div>
        ))}
      </div>

      <div>
        <h4 className="text-xs font-semibold mb-2">Days to complete — by company</h4>
        {bars.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">No dispatched cases in this period.</p>
        ) : (
        <div className="relative pl-20 pr-4">
          <div className="absolute top-0 bottom-6" style={{ left: `calc(5rem + ${(avg / chartMax) * 100}% - ${(avg / chartMax) * 1}rem)` }}>
            <div className="border-l border-dashed border-muted-foreground/60 h-full" />
            <div className="absolute -top-3 -translate-x-1/2 text-[10px] text-muted-foreground">Avg.</div>
          </div>
          <div className="space-y-1.5">
            {bars.map((b) => (
              <div key={`${b.companyName}-${b.dispatchedAt}`} className="flex items-center gap-2 group relative">
                <div className="w-20 -ml-20 text-xs text-foreground truncate pr-2">{b.shortName}</div>
                <div className={["flex-1 h-5 rounded-sm relative", bgFor(b.state)].join(" ")}>
                  <div
                    className={["h-full rounded-sm flex items-center justify-end pr-1.5", colorFor(b.state)].join(" ")}
                    style={{ width: `${(b.days / chartMax) * 100}%` }}
                  >
                    {b.state === "expired" && (
                      <span className="text-[9px] text-white font-medium">Expired</span>
                    )}
                    {b.state === "over-progress" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    )}
                  </div>
                  <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-foreground/80 tabular-nums" style={{ left: `calc(${(b.days / chartMax) * 100}% + 4px)` }}>
                    {b.days}d
                  </span>
                </div>
                <div className="absolute left-20 -top-2 -translate-y-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 rounded-md border border-border bg-card shadow-md p-2 text-[11px] min-w-[180px]">
                  <div className="font-semibold text-foreground">{b.companyName}</div>
                  <span className={["inline-block mt-1 px-1.5 py-0.5 rounded-full text-[10px]", bgFor(b.state), b.state === "expired" ? "text-status-abandoned-fg" : b.state === "under" ? "text-status-completed-fg" : "text-status-pending-fg"].join(" ")}>{b.status}</span>
                  <div className="mt-1 text-muted-foreground">Dispatched: <span className="text-foreground">{b.dispatchedAt}</span></div>
                  <div className="text-muted-foreground">{b.state === "expired" ? "Expired" : "Submitted"}: <span className="text-foreground">{b.endAt}</span></div>
                  <div className="text-muted-foreground">Total days: <span className="text-foreground tabular-nums">{b.days.toFixed(1)} days</span></div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
            {[0, chartMax * 0.25, chartMax * 0.5, chartMax * 0.75, chartMax].map((n) => (
              <span key={n}>{Math.round(n)}</span>
            ))}
          </div>
        </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
        <span>
          Based on {data.caseCount} case{data.caseCount === 1 ? "" : "s"} in the selected period
          {data.includesInProgress ? " · Includes in-progress cases" : ""}
          {" · "}Expired cases counted at Day {data.expiredCapDays}
        </span>
        <Link to="/audit-log" className="text-navy font-medium hover:underline whitespace-nowrap ml-2">View full audit log →</Link>
      </div>
        </>
      )}
    </div>
  );
}
