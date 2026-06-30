import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Check, ChevronRight, Circle, Download, Loader2, Search } from "lucide-react";
import type { AuditEvent, EventType } from "@/types/audit";
import type { CaseRecord } from "@/types/case";
import { auditService, casesService } from "@/services";
import { AppShell } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateField } from "@/components/ui/date-field";
import { absTime } from "@/lib/format";
import { groupAuditEventsByCase, indexAuditEventsByCase, resolveAuditCaseLabels } from "@/lib/audit-log";
import { buildWorkflowProgress, normalizeWorkflowStep } from "@/lib/workflow-progress";
import { toast } from "sonner";
import { WORKFLOW_STEPS } from "@/config/workflow";
import { StatusBadge } from "@/components/common/StatusBadge";

const search = z.object({ caseId: z.string().optional() });


const EVENT_TYPES: (EventType | "All")[] = ["All", "API Call", "Link Event", "Authentication", "Form Activity", "Researcher Action", "API Push"];

export default function AuditLogPage() {
  const [searchParams] = useSearchParams();
  const sp = search.parse({ caseId: searchParams.get("caseId") ?? undefined });
  const { data: mockAuditLog = [] } = useQuery<AuditEvent[]>({
    queryKey: ["audit-log"],
    queryFn: () => auditService.list(),
  });
  const { data: mockCases = [] } = useQuery<CaseRecord[]>({
    queryKey: ["cases"],
    queryFn: () => casesService.list(),
  });

  const [q, setQ] = useState("");
  const [type, setType] = useState<EventType | "All">("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return mockAuditLog.filter((e) => {
      if (sp.caseId && e.caseId !== sp.caseId) return false;
      if (q) {
        const caseRecord = mockCases.find((m) => m.id === e.caseId);
        const { subject, orderId } = resolveAuditCaseLabels(e, caseRecord);
        if (!`${subject} ${orderId}`.toLowerCase().includes(q.toLowerCase())) return false;
      }
      if (type !== "All" && e.type !== type) return false;
      const t = new Date(e.timestamp).getTime();
      if (from && t < new Date(from).getTime()) return false;
      if (to && t > new Date(to).getTime() + 86_400_000) return false;
      return true;
    });
  }, [q, type, from, to, sp.caseId, mockAuditLog, mockCases]);

  const grouped = useMemo(() => groupAuditEventsByCase(filtered), [filtered]);
  const eventsByCase = useMemo(() => indexAuditEventsByCase(filtered), [filtered]);

  const toggle = (id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
  };

  const exportCsv = () => {
    const csv = ["Timestamp,Case,Order,Step,Type,Description,TriggeredBy,Status",
      ...grouped.map((e) => {
        const caseRecord = mockCases.find((m) => m.id === e.caseId);
        const { subject, orderId } = resolveAuditCaseLabels(e, caseRecord);
        return [e.timestamp, subject, orderId, e.step, e.type, e.description, e.triggeredBy, e.status]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
      })].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "cedarrose-audit-log.csv"; a.click(); URL.revokeObjectURL(url);
    toast.success("Audit log exported.");
  };

  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Audit log</h2>
          <p className="text-sm text-muted-foreground">
            {grouped.length} case{grouped.length === 1 ? "" : "s"}
            {filtered.length !== grouped.length ? ` · ${filtered.length} events` : ""}
            {sp.caseId ? " · filtered by case" : ""}
          </p>
        </div>

        <div className="rounded-[10px] border border-[#EDF2F7] bg-white p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[12px] font-medium text-[#4A5568] mb-1.5">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A5568]" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search subject or order ID"
                  className="pl-9 h-11 rounded-lg border-[#CBD5E0] bg-white text-[14px] text-[#2D3748] focus-visible:border-[#2B3178] focus-visible:ring-[#2B3178]"
                />
              </div>
            </div>
            <div style={{ width: 180 }}>
              <label className="block text-[12px] font-medium text-[#4A5568] mb-1.5">Event type</label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger className="h-11 rounded-lg border-[#CBD5E0] bg-white text-[14px] text-[#2D3748] focus:border-[#2B3178] focus:ring-[#2B3178]"><SelectValue /></SelectTrigger>
                <SelectContent>{EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div style={{ width: 160 }}>
              <label className="block text-[12px] font-medium text-[#4A5568] mb-1.5">From date</label>
              <DateField value={from} onChange={setFrom} />
            </div>
            <div style={{ width: 160 }}>
              <label className="block text-[12px] font-medium text-[#4A5568] mb-1.5">To date</label>
              <DateField value={to} onChange={setTo} minDate={from || undefined} />
            </div>
            <div className="ml-auto">
              <Button variant="outline" onClick={exportCsv} className="h-11 rounded-lg"><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground uppercase tracking-wide bg-secondary/60">
              <tr>
                <th className="px-3 py-3 w-8" />
                <th className="px-3 py-3 font-medium">Timestamp</th>
                <th className="px-3 py-3 font-medium">Case</th>
                <th className="px-3 py-3 font-medium">Step</th>
                <th className="px-3 py-3 font-medium">Type</th>
                <th className="px-3 py-3 font-medium">Description</th>
                <th className="px-3 py-3 font-medium">Triggered by</th>
                <th className="px-3 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {grouped.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No events match the current filters.</td></tr>
              ) : grouped.map((e) => {
                const rowKey = e.caseId || e.id;
                const isOpen = expanded === rowKey;
                const caseRecord = mockCases.find((m) => m.id === e.caseId);
                const { subject, orderId } = resolveAuditCaseLabels(e, caseRecord);
                const caseEvents = eventsByCase.get(rowKey) ?? [e];
                const timeline = buildWorkflowProgress(caseRecord, caseEvents);
                return (
                  <FragmentRow key={rowKey}>
                    <tr className="border-t border-border hover:bg-secondary/40 cursor-pointer" onClick={() => toggle(rowKey)}>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={(ev) => { ev.stopPropagation(); toggle(rowKey); }}
                          aria-label={isOpen ? "Collapse row" : "Expand row"}
                          className="inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-background text-foreground hover:bg-secondary"
                        >
                          <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
                        </button>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground text-xs whitespace-nowrap">{absTime(e.timestamp)}</td>
                      <td className="px-3 py-3">
                        <div className="font-medium">{subject}</div>
                        {orderId && <div className="text-xs text-muted-foreground font-mono">{orderId}</div>}
                      </td>
                      <td className="px-3 py-3">{normalizeWorkflowStep(e.step) ?? e.step}</td>
                      <td className="px-3 py-3 text-muted-foreground">{e.type}</td>
                      <td className="px-3 py-3">{e.description}</td>
                      <td className="px-3 py-3 text-muted-foreground">{e.triggeredBy}</td>
                      <td className="px-3 py-3">
                        <span className={[
                          "inline-flex px-2 py-0.5 rounded-full text-xs font-medium",
                          e.status === "Success" ? "bg-status-completed-bg text-status-completed-fg" :
                          e.status === "Failed" ? "bg-status-abandoned-bg text-status-abandoned-fg" :
                          "bg-status-pending-bg text-status-pending-fg",
                        ].join(" ")}>{e.status}</span>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${rowKey}-detail`} className="border-t border-border bg-card">
                        <td />
                        <td colSpan={7} className="px-0 py-0">
                          <WorkflowTimelinePanel
                            title={subject}
                            orderId={orderId}
                            status={caseRecord?.status}
                            currentStep={timeline.currentStep}
                            completedAt={timeline.completedAt}
                          />
                        </td>
                      </tr>
                    )}
                  </FragmentRow>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function WorkflowTimelinePanel({
  title, orderId, status, currentStep, completedAt,
}: {
  title: string;
  orderId: string;
  status?: import("@/types/case").CaseStatus;
  currentStep: number;
  completedAt: (string | null)[];
}) {
  const left = WORKFLOW_STEPS.slice(0, 8);
  const right = WORKFLOW_STEPS.slice(8);
  const renderStep = (name: string, idx: number) => {
    const num = idx + 1;
    const state = num < currentStep ? "done" : num === currentStep ? "current" : "todo";
    const ts = completedAt[idx];
    return (
      <li key={num} className="flex items-start gap-3">
        <span className="mt-0.5">
          {state === "done" && (
            <span className="h-[18px] w-[18px] rounded-full bg-status-completed-bg text-status-completed-fg flex items-center justify-center">
              <Check className="h-3 w-3" />
            </span>
          )}
          {state === "current" && (
            <span className="h-[18px] w-[18px] rounded-full bg-status-progress-bg text-status-progress-fg flex items-center justify-center">
              <Loader2 className="h-3 w-3 animate-spin" />
            </span>
          )}
          {state === "todo" && (
            <span className="h-[18px] w-[18px] rounded-full bg-muted text-muted-foreground flex items-center justify-center">
              <Circle className="h-2 w-2" />
            </span>
          )}
        </span>
        <div className="flex-1 pb-3">
          <div className={`text-sm ${state === "todo" ? "text-muted-foreground" : "text-foreground font-medium"}`}>
            <span className="text-muted-foreground mr-1 font-normal">Step {num}.</span>
            {name}
          </div>
          {state === "done" && ts && (
            <div className="text-xs text-muted-foreground mt-0.5">{ts}</div>
          )}
          {state === "current" && (
            <div className="text-xs text-status-progress-fg italic mt-0.5">In progress</div>
          )}
        </div>
      </li>
    );
  };
  return (
    <div className="border-t border-border">
      <div className="flex items-center justify-between bg-secondary/60 px-4 py-2">
        <div className="text-sm">
          <span className="font-semibold text-foreground">{title}</span>
          <span className="text-muted-foreground"> · {orderId}</span>
        </div>
        {status && <StatusBadge status={status} />}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 px-4 py-4">
        <ol className="relative">
          <span className="absolute left-[8.5px] top-2 bottom-2 w-px bg-border" aria-hidden />
          <div className="relative">{left.map((n, i) => renderStep(n, i))}</div>
        </ol>
        <ol className="relative">
          <span className="absolute left-[8.5px] top-2 bottom-2 w-px bg-border" aria-hidden />
          <div className="relative">{right.map((n, i) => renderStep(n, i + 8))}</div>
        </ol>
      </div>
    </div>
  );
}
