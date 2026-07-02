import { useState } from "react";
import { ChevronDown, Database, User, Info } from "lucide-react";
import type { QuestionnaireResponse } from "@/types/case";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { countAnswered } from "@/lib/response-completion";

type Source = "cris" | "subject" | "missing";

function inferSource(response: QuestionnaireResponse, companyName: string): Source {
  const answer = response.answer?.trim();
  if (!answer) return "missing";
  if (answer === companyName) return "cris";
  return "subject";
}

function SourceBadge({ source }: Readonly<{ source: Source }>) {
  if (source === "cris") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[11px] font-medium">
        <Database className="h-3 w-3" /> Pre-filled — CRiS
      </span>
    );
  }
  if (source === "subject") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 text-green-700 px-2 py-0.5 text-[11px] font-medium">
        <User className="h-3 w-3" /> Filled by subject
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-[11px] font-medium">
      Not provided
    </span>
  );
}

interface Props {
  readonly responses: QuestionnaireResponse[];
  readonly companyName: string;
}

export function ResponsesReview({ responses, companyName }: Props) {
  const [open, setOpen] = useState(true);

  if (!responses.length) {
    return (
      <div className="rounded-lg border border-border bg-secondary/30 px-4 py-8 text-center text-sm text-muted-foreground">
        No questionnaire responses saved yet. Progress will appear here once the recipient starts the form.
      </div>
    );
  }

  const mandatory = responses.filter((r) => r.mandatory);
  const optional = responses.filter((r) => !r.mandatory);
  const cris = responses.filter((r) => inferSource(r, companyName) === "cris").length;
  const subject = countAnswered(responses.filter((r) => inferSource(r, companyName) === "subject"));
  const missing = responses.filter((r) => !r.answer?.trim() && r.mandatory).length;
  const optionalMissing = responses.filter((r) => !r.answer?.trim() && !r.mandatory).length;

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-xs px-3 py-2 flex items-center gap-2">
        <Info className="h-4 w-4 shrink-0" />
        <span>
          <strong className="text-navy">{cris}</strong> pre-filled from CRiS{" "}
          <span className="mx-2 text-blue-300">|</span>{" "}
          <strong className="text-navy">{subject}</strong> filled by subject{" "}
          <span className="mx-2 text-blue-300">|</span>{" "}
          <strong className="text-navy">{countAnswered(mandatory)}/{mandatory.length || "—"}</strong> mandatory
          {optional.length > 0 && (
            <>
              <span className="mx-2 text-blue-300">|</span>
              <strong className="text-navy">{countAnswered(optional)}/{optional.length}</strong> optional
            </>
          )}
          {(missing > 0 || optionalMissing > 0) && (
            <>
              <span className="mx-2 text-blue-300">|</span>
              <strong className="text-navy">{missing + optionalMissing}</strong> not provided
            </>
          )}
        </span>
      </div>

      <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border border-border bg-card">
        <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/40">
          <span className="text-sm font-semibold text-left">Questionnaire responses ({responses.length})</span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            {responses.map((r, i) => {
              const source = inferSource(r, companyName);
              const display = r.answer?.trim() || "—";
              return (
                <div key={`${r.question}-${i}`} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs text-muted-foreground">{r.question}</label>
                    {r.mandatory && (
                      <span className="text-[10px] text-status-abandoned-fg font-medium">Required</span>
                    )}
                    <SourceBadge source={source} />
                  </div>
                  <div className="mt-1 text-sm text-foreground whitespace-pre-wrap">{display}</div>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
