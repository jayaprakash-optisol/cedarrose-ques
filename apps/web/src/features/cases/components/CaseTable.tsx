import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, AlertTriangle } from "lucide-react";
import { format, isPast } from "date-fns";
import type { CaseRecord } from "@/types/case";
import { RecipientBadge, StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { ResendLinkModal } from "@/features/cases/components/ResendLinkModal";
import { toast } from "sonner";
import { relTime, isStale } from "@/lib/format";
import { caseCompanyName, caseCrisUid } from "@/lib/case-display";

type SortKey = "status" | "lastActivity" | null;

const STATUS_PRIORITY: Record<CaseRecord["status"], number> = {
  "PENDING LINKAGE & CONTACT": 0,
  "PENDING CONTACT": 1,
  "EXPIRED": 2,
  "COMPLETED — MISSING DATA": 3,
  "IN PROGRESS": 4,
  "OPENED": 5,
  "SENT": 6,
  "NOT SENT": 7,
  "COMPLETED": 8,
};


function isLinkExpired(c: CaseRecord): boolean {
  if (!c.linkExpiry) return false;
  return isPast(new Date(c.linkExpiry));
}

function renderLinkExpiry(c: CaseRecord) {
  const muted = <span className="text-muted-foreground">—</span>;
  if (c.status === "COMPLETED" || c.status === "COMPLETED — MISSING DATA" || !c.linkExpiry) return muted;
  const expiry = new Date(c.linkExpiry);
  if (isLinkExpired(c)) return muted;
  const label = format(expiry, "dd MMM yyyy");
  const diffDays = Math.ceil((expiry.getTime() - Date.now()) / 86_400_000);
  if (diffDays <= 3) {
    return (
      <span className="inline-flex items-center gap-1.5 text-destructive font-medium">
        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
        {label}
      </span>
    );
  }
  if (diffDays <= 6) {
    return <span className="text-amber-600 font-medium">{label}</span>;
  }
  return <span className="text-muted-foreground">{label}</span>;
}

function renderReminders(c: CaseRecord) {
  if (c.remindersSent === null) {
    return <span className="text-muted-foreground">—</span>;
  }
  const sent = c.remindersSent;
  return (
    <div className="inline-flex items-center gap-1.5">
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={
              i < sent
                ? "h-2 w-2 rounded-full bg-foreground"
                : "h-2 w-2 rounded-full border border-muted-foreground/50"
            }
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">{sent}/3</span>
    </div>
  );
}

function renderExpiresIn(c: CaseRecord) {
  const muted = <span className="text-muted-foreground">—</span>;
  const naStatuses: CaseRecord["status"][] = [
    "COMPLETED",
    "COMPLETED — MISSING DATA",
    "PENDING CONTACT",
    "PENDING LINKAGE & CONTACT",
    "NOT SENT",
  ];
  if (naStatuses.includes(c.status) || !c.linkExpiry) {
    if (c.status === "EXPIRED" || isLinkExpired(c)) return <span className="text-foreground/70">Expired</span>;
    return muted;
  }
  const expiry = new Date(c.linkExpiry);
  if (isLinkExpired(c) || c.status === "EXPIRED") {
    return <span className="text-foreground/70">Expired</span>;
  }
  const diffDays = Math.ceil((expiry.getTime() - Date.now()) / 86_400_000);
  const label = `${diffDays}d`;
  if (diffDays <= 1) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        {label}
      </span>
    );
  }
  if (diffDays <= 3) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
        {label}
      </span>
    );
  }
  if (diffDays <= 6) {
    return <span className="text-foreground/80">{label}</span>;
  }
  return <span className="text-muted-foreground">{label}</span>;
}

interface Props {
  readonly cases: CaseRecord[];
  readonly onRowClick?: (c: CaseRecord) => void;
  readonly showOrderId?: boolean;
}

export function CaseTable({ cases, onRowClick, showOrderId = false }: Props) {
  const queryClient = useQueryClient();
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [resendCase, setResendCase] = useState<CaseRecord | null>(null);
  const [resentIds, setResentIds] = useState<Set<string>>(new Set());

  const effectiveStatus = (c: CaseRecord): CaseRecord["status"] => {
    if (resentIds.has(c.id) && c.status === "EXPIRED") return "SENT";
    if (isLinkExpired(c) && ["SENT", "OPENED", "IN PROGRESS"].includes(c.status)) return "EXPIRED";
    return c.status;
  };


  const sorted = useMemo(() => {
    const arr = [...cases];
    if (!sortKey) {
      // default: needs-attention float to top
      arr.sort((a, b) => {
        const pa = STATUS_PRIORITY[a.status];
        const pb = STATUS_PRIORITY[b.status];
        if (pa !== pb) return pa - pb;
        return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
      });
      return arr;
    }
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "status") cmp = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
      else cmp = new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [cases, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground uppercase tracking-wide bg-secondary/60">
          <tr>
            {showOrderId && <th className="px-4 py-3 font-medium">Order ID</th>}
            <th className="px-4 py-3 font-medium">Company name</th>
            <th className="px-4 py-3 font-medium">Country</th>
            <th className="px-4 py-3 font-medium">Recipient</th>
            <th className="px-4 py-3 font-medium">Analyst</th>
            <th className="px-4 py-3 font-medium">
              <button onClick={() => toggleSort("status")} className="inline-flex items-center gap-1 hover:text-foreground">
                Status <ArrowUpDown className="h-3 w-3" />
              </button>
            </th>
            <th className="px-4 py-3 font-medium">Completion</th>
            <th className="px-4 py-3 font-medium">Reminders</th>
            <th className="px-4 py-3 font-medium">
              <button onClick={() => toggleSort("lastActivity")} className="inline-flex items-center gap-1 hover:text-foreground">
                Last Activity <ArrowUpDown className="h-3 w-3" />
              </button>
            </th>
            <th className="px-4 py-3 font-medium">Expires In</th>
            <th className="px-4 py-3 font-medium">Link Expiry</th>
            <th className="px-4 py-3 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={showOrderId ? 12 : 11} className="px-4 py-12 text-center text-muted-foreground">
                No cases match the current filters.
              </td>
            </tr>
          ) : sorted.map((c) => {
            const stale = c.status === "IN PROGRESS" && isStale(c.lastActivity, 72);
            const pct = Math.round((c.completionMandatory.done / c.completionMandatory.total) * 100);
            return (
              <tr
                key={c.id}
                onClick={() => onRowClick?.(c)}
                className="border-t border-border hover:bg-secondary/40 cursor-pointer"
              >
                {showOrderId && <td className="px-4 py-3 font-mono text-xs">{c.orderId}</td>}
                <td className="px-4 py-3 font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    {stale && (
                      <span title="No activity for >72h" className="text-status-pending-fg">
                        <AlertTriangle className="h-4 w-4" />
                      </span>
                    )}
                    {caseCompanyName(c)}
                  </div>
                  <div className="text-xs text-muted-foreground">{caseCrisUid(c)}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{c.country}</td>
                <td className="px-4 py-3"><RecipientBadge type={c.recipientType} /></td>
                <td className="px-4 py-3 text-muted-foreground">{c.analyst}</td>
                <td className="px-4 py-3"><StatusBadge status={effectiveStatus(c)} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-navy" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {c.completionMandatory.done}/{c.completionMandatory.total}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">{renderReminders(c)}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{relTime(c.lastActivity)}</td>
                <td className="px-4 py-3 text-xs">{renderExpiresIn(c)}</td>
                <td className="px-4 py-3 text-xs">{renderLinkExpiry(c)}</td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  {effectiveStatus(c) === "EXPIRED" ? (
                    <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50" onClick={() => setResendCase(c)}>
                      Resend link
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => onRowClick?.(c)}>View details</Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {resendCase && (
        <ResendLinkModal
          case={resendCase}
          open={!!resendCase}
          onClose={() => setResendCase(null)}
          onConfirmed={() => {
            setResentIds((s) => new Set(s).add(resendCase.id));
            void queryClient.invalidateQueries({ queryKey: ["cases"] });
            toast.success(`Link resent to ${caseCompanyName(resendCase)}.`);
          }}
          onViewDetails={() => onRowClick?.(resendCase)}
        />
      )}
    </div>
  );
}
