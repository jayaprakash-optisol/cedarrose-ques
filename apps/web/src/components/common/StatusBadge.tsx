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

const STATUS_META: Record<CaseStatus, { meaning: string; action: string; tone: ActionTone }> = {
  "SENT": {
    meaning: "Questionnaire dispatched. Subject has not yet opened it.",
    action: "No — monitoring only",
    tone: "green",
  },
  "OPENED": {
    meaning: "Subject clicked the link and authenticated.",
    action: "No — monitoring only",
    tone: "green",
  },
  "IN PROGRESS": {
    meaning: "Subject has started completing the form.",
    action: "No — monitoring only",
    tone: "green",
  },
  "COMPLETED": {
    meaning: "All mandatory fields submitted. E-signature applied.",
    action: "Yes — validate and use for report",
    tone: "amber",
  },
  "COMPLETED — MISSING DATA": {
    meaning: "Submitted but optional fields missing.",
    action: "Yes — validate; consider follow-up",
    tone: "amber",
  },
  "PENDING CONTACT": {
    meaning: "Questionnaire on hold: no contact email available.",
    action: "Yes — source contact email",
    tone: "red",
  },
  "PENDING LINKAGE & CONTACT": {
    meaning: "Questionnaire on hold: no company link and no contact.",
    action: "Yes — link profile and source email",
    tone: "red",
  },
  "EXPIRED": {
    meaning: "Questionnaire link has expired without submission.",
    action: "Yes — reissue link if still needed",
    tone: "red",
  },
  "NOT SENT": {
    meaning: "Questionnaire was not sent (order too early or excluded).",
    action: "Review — manual decision",
    tone: "grey",
  },
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

export function StatusBadge({ status }: { status: CaseStatus }) {
  const meta = STATUS_META[status];
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
          <div className="text-xs text-muted-foreground mb-1.5 leading-snug">{meta.meaning}</div>
          <div className={["text-xs font-medium", TONE_CLASS[meta.tone]].join(" ")}>{meta.action}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ResearcherBadge({ status }: { status: ResearcherStatus }) {
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

export function RecipientBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-border bg-card text-foreground">
      {type}
    </span>
  );
}
