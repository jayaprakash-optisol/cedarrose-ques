import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Check, ChevronRight, Circle, Loader2, Search } from "lucide-react";
import type { AuditEvent, EventType } from "@/types/audit";
import type { CaseRecord } from "@/types/case";
import { auditService, casesService } from "@/services";
import { AppShell } from "@/components/layout/AppShell";
import { ListPagination } from "@/components/common/ListPagination";
import { ListHeader, FilterField, SelectFilterField, DateRangeFilterFields, ExportButton } from "@/components/common/ListFilterBar";
import { Input } from "@/components/ui/input";
import { absTime } from "@/lib/format";
import { indexAuditEventsByCase, resolveAuditCaseLabels } from "@/lib/audit-log";
import { resolveWorkflowStepState } from "@/lib/workflow-step-state";
import { buildWorkflowProgress, normalizeWorkflowStep } from "@/lib/workflow-progress";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePaginatedDateFilter } from "@/hooks/usePaginatedDateFilter";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";
import { toast } from "sonner";
import { WORKFLOW_STEPS } from "@/config/workflow";
import { StatusBadge } from "@/components/common/StatusBadge";

const search = z.object({ caseId: z.string().optional() });

const EVENT_TYPES: (EventType | "All")[] = ["All", "API Call", "Link Event", "Authentication", "Form Activity", "Researcher Action", "API Push"];

export default function AuditLogPage() {
  const [searchParams] = useSearchParams();
  const sp = search.parse({ caseId: searchParams.get("caseId") ?? undefined });

  const [q, setQ] = useState("");
  const [type, setType] = useState<EventType | "All">("All");
  const { from, setFrom, to, setTo, page, setPage, limit, setLimit } = usePaginatedDateFilter(DEFAULT_PAGE_SIZE);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebouncedValue(q);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, type, from, to, sp.caseId, setPage]);

  const listParams = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      type: type === "All" ? undefined : type,
      from: from || undefined,
      to: to || undefined,
      caseId: sp.caseId,
      grouped: true as const,
    }),
    [page, limit, debouncedSearch, type, from, to, sp.caseId],
  );

  const { data: result, isFetching } = useQuery({
    queryKey: ["audit-log", listParams],
    queryFn: () => auditService.list(listParams),
    placeholderData: (prev) => prev,
  });

  const grouped = result?.data ?? [];
  const meta = result?.meta ?? { page, limit, total: 0 };

  const expandedCaseId = expanded && !expanded.startsWith("orphan:") ? expanded : null;

  const { data: expandedAuditResult } = useQuery({
    queryKey: ["audit-log", "case", expandedCaseId],
    queryFn: () =>
      auditService.list({ caseId: expandedCaseId!, grouped: false, limit: 500, page: 1 }),
    enabled: !!expandedCaseId,
  });

  const { data: expandedCase } = useQuery({
    queryKey: ["case", expandedCaseId],
    queryFn: () => casesService.getById(expandedCaseId!),
    enabled: !!expandedCaseId,
  });

  const eventsByCase = useMemo(() => {
    if (!expandedCaseId || !expandedAuditResult) return new Map<string, AuditEvent[]>();
    return indexAuditEventsByCase(expandedAuditResult.data);
  }, [expandedCaseId, expandedAuditResult]);

  const toggle = (id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
  };

  const exportCsv = async () => {
    try {
      setExporting(true);
      await auditService.exportCsv({
        search: debouncedSearch || undefined,
        type: type === "All" ? undefined : type,
        from: from || undefined,
        to: to || undefined,
        caseId: sp.caseId,
      });
      toast.success("Audit log exported.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-4">
        <ListHeader
          title="Audit log"
          count={meta.total}
          countSuffix={sp.caseId ? " · filtered by case" : ""}
          isFetching={isFetching}
        />

        <div className="rounded-[10px] border border-[#EDF2F7] bg-white p-4">
          <div className="flex flex-wrap items-end gap-4">
            <FilterField label="Search" htmlFor="audit-search" className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A5568]" />
                <Input
                  id="audit-search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search subject or order ID"
                  className="pl-9 h-11 rounded-lg border-[#CBD5E0] bg-white text-[14px] text-[#2D3748] focus-visible:border-[#2B3178] focus-visible:ring-[#2B3178]"
                />
              </div>
            </FilterField>
            <SelectFilterField
              label="Event type"
              htmlFor="audit-event-type"
              width={180}
              value={type}
              onValueChange={(v) => setType(v as typeof type)}
              options={EVENT_TYPES}
            />
            <DateRangeFilterFields from={from} onFromChange={setFrom} to={to} onToChange={setTo} />
            <ExportButton onClick={exportCsv} disabled={exporting} label="Export CSV" className="ml-auto" />
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
                <th className="px-3 py-3 font-medium">Case status</th>
              </tr>
            </thead>
            <tbody>
              {grouped.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No events match the current filters.</td></tr>
              ) : grouped.map((e) => {
                const rowKey = e.caseId || `orphan:${e.id}`;
                const isOpen = expanded === rowKey;
                const { subject, orderId } = resolveAuditCaseLabels(e);
                const caseEvents = isOpen ? (eventsByCase.get(rowKey) ?? [e]) : [e];
                const caseRecord = resolveCaseStatusRecord(expandedCase, e.caseStatus);
                const timeline = isOpen && expandedCase
                  ? buildWorkflowProgress(expandedCase, caseEvents)
                  : null;
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
                        {caseRecord?.status ? (
                          <StatusBadge status={caseRecord.status} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                    {isOpen && timeline && (
                      <tr key={`${rowKey}-detail`} className="border-t border-border bg-card">
                        <td />
                        <td colSpan={7} className="px-0 py-0">
                          <WorkflowTimelinePanel
                            title={subject}
                            orderId={orderId}
                            status={expandedCase?.status}
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

        <ListPagination
          meta={meta}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setLimit(next);
            setPage(1);
          }}
        />
      </div>
    </AppShell>
  );
}

function resolveCaseStatusRecord(
  expandedCase: CaseRecord | undefined,
  eventCaseStatus: AuditEvent["caseStatus"],
): Pick<CaseRecord, "status"> | undefined {
  if (expandedCase?.status) return expandedCase;
  if (eventCaseStatus) return { status: eventCaseStatus as CaseRecord["status"] };
  return undefined;
}

function FragmentRow({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}

function WorkflowTimelinePanel({
  title, orderId, status, currentStep, completedAt,
}: Readonly<{
  title: string;
  orderId: string;
  status?: import("@/types/case").CaseStatus;
  currentStep: number;
  completedAt: (string | null)[];
}>) {
  const left = WORKFLOW_STEPS.slice(0, 8);
  const right = WORKFLOW_STEPS.slice(8);
  const renderStep = (name: string, idx: number) => {
    const num = idx + 1;
    const state = resolveWorkflowStepState(num, currentStep);
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
