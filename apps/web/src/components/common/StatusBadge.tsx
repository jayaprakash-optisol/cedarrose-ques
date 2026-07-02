import { AlertTriangle } from "lucide-react";
import type { CaseStatus, ResearcherStatus } from "@/types/case";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

const STATUS_CLASS: Record<CaseStatus, string> = {
  "SENT": "bg-slate-200 text-slate-700",
  "OPENED": "bg-sky-100 text-sky-700",
  "IN PROGRESS": "bg-amber-100 text-amber-800",
  "COMPLETED": "bg-emerald-100 text-emerald-800",
  "COMPLETED — MISSING DATA": "bg-yellow-100 text-yellow-800",
  "PENDING CONTACT": "bg-orange-100 text-orange-800",
  "PENDING LINKAGE & CONTACT": "bg-red-100 text-red-800",
  "EXPIRED": "bg-slate-400 text-slate-900",
  "NOT SENT": "bg-white border border-slate-300 text-slate-600",
};

type ActionTone = "green" | "amber" | "red" | "grey";

const STATUS_MEANING: Record<CaseStatus, string> = {
  "SENT": "Questionnaire dispatched. Subject has not yet opened it.",
  "OPENED": "Subject clicked the link and authenticated.",
  "IN PROGRESS": "Subject has started completing the form.",
  "COMPLETED": "All mandatory fields submitted. E-signature applied.",
  "COMPLETED — MISSING DATA": "Submitted but optional fields missing.",
  "PENDING CONTACT": "Questionnaire on hold: no contact email available.",
  "PENDING LINKAGE & CONTACT": "Questionnaire on hold: no company link and no contact.",
  "EXPIRED": "Questionnaire link has expired without submission.",
  "NOT SENT": "Questionnaire was not sent (order too early or excluded).",
};

const STATUS_ACTION: Record<CaseStatus, string> = {
  "SENT": "No — monitoring only",
  "OPENED": "No — monitoring only",
  "IN PROGRESS": "No — monitoring only",
  "COMPLETED": "Yes — validate and use for report",
  "COMPLETED — MISSING DATA": "Yes — validate; consider follow-up",
  "PENDING CONTACT": "Yes — source contact email",
  "PENDING LINKAGE & CONTACT": "Yes — link profile and source email",
  "EXPIRED": "Yes — reissue link if still needed",
  "NOT SENT": "Review — manual decision",
};

const STATUS_TONE: Record<CaseStatus, ActionTone> = {
  "SENT": "green",
  "OPENED": "green",
  "IN PROGRESS": "green",
  "COMPLETED": "amber",
  "COMPLETED — MISSING DATA": "amber",
  "PENDING CONTACT": "red",
  "PENDING LINKAGE & CONTACT": "red",
  "EXPIRED": "red",
  "NOT SENT": "grey",
};

const TONE_CLASS: Record<ActionTone, string> = {
  green: "text-emerald-700",
  amber: "text-amber-700",
  red: "text-red-700",
  grey: "text-slate-600",
};

const RESEARCHER_CLASS: Record<ResearcherStatus, string> = {
  "Not Applicable": "bg-muted text-muted-foreground",
  "Awaiting Review": "bg-amber-100 text-amber-800",
  "Approved": "bg-emerald-100 text-emerald-800",
  "Flagged": "bg-amber-100 text-amber-800",
  "Rejected": "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { readonly status: CaseStatus }) {
  const meaning = STATUS_MEANING[status];
  const action = STATUS_ACTION[status];
  const tone = STATUS_TONE[status];
  const showWarn = status === "COMPLETED — MISSING DATA";
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={[
              "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap cursor-default",
              STATUS_CLASS[status],
            ].join(" ")}
          >
            {showWarn && <AlertTriangle className="h-3 w-3" />}
            {status}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={6}
          collisionPadding={12}
          className="bg-white text-foreground border border-border shadow-md max-w-xs px-3 py-2"
        >
          <div className="font-semibold text-xs mb-1">{status}</div>
          <div className="text-xs text-muted-foreground mb-1.5 leading-snug">{meaning}</div>
          <div className={["text-xs font-medium", TONE_CLASS[tone]].join(" ")}>{action}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ResearcherBadge({ status }: { readonly status: ResearcherStatus }) {
  return (
    <span
      className={[
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        RESEARCHER_CLASS[status],
      ].join(" ")}
    >
      {status}
    </span>
  );
}

export function RecipientBadge({ type }: { readonly type: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-border bg-card text-foreground">
      {type}
    </span>
  );
}
