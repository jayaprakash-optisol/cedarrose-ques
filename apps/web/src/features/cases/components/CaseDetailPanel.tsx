import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Check, Loader2, Circle } from "lucide-react";
import type { CaseRecord } from "@/types/case";
import { WORKFLOW_STEPS } from "@/config/workflow";
import { buildWorkflowProgress } from "@/lib/workflow-progress";
import { resolveWorkflowStepState } from "@/lib/workflow-step-state";
import { RecipientBadge, StatusBadge } from "@/components/common/StatusBadge";
import { ResponsesReview } from "@/features/cases/components/ResponsesReview";
import { absTime } from "@/lib/format";
import { caseCompanyName, caseCrisUid } from "@/lib/case-display";
import { resolveCaseCompletion } from "@/lib/response-completion";
import { casesService, auditService } from "@/services";

interface Props {
  readonly case: CaseRecord | null;
  readonly open: boolean;
  readonly onOpenChange: (o: boolean) => void;
}

export function CaseDetailPanel({ case: selected, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const caseId = selected?.id;

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["case", caseId],
    queryFn: () => casesService.getById(caseId!),
    enabled: open && !!caseId,
  });

  const { data: auditResult } = useQuery({
    queryKey: ["audit-log", "case", caseId],
    queryFn: () => auditService.list({ caseId: caseId!, grouped: false, limit: 500, page: 1 }),
    enabled: open && !!caseId,
  });
  const auditEvents = auditResult?.data ?? [];

  useEffect(() => {
    if (detail) {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
    }
  }, [detail, queryClient]);

  const c = detail ?? selected;
  if (!c) return null;

  const companyName = caseCompanyName(c);
  const completion = resolveCaseCompletion(c);
  const timeline = buildWorkflowProgress(c, auditEvents);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[720px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {caseCompanyName(c)} <RecipientBadge type={c.recipientType} />
          </SheetTitle>
          <div className="text-xs text-muted-foreground space-x-3">
            <span>UID <span className="font-mono">{caseCrisUid(c)}</span></span>
            <span>Order <span className="font-mono">{c.orderId}</span></span>
            <span>Submitted {absTime(c.lastActivity)}</span>
            <span>{c.country}</span>
          </div>
          <div className="pt-1 flex items-center gap-2">
            <StatusBadge status={c.status} />
            {detailLoading && (
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Syncing…
              </span>
            )}
          </div>
        </SheetHeader>

        {(() => {
          const showResponses = (
            ["IN PROGRESS", "COMPLETED", "COMPLETED — MISSING DATA", "EXPIRED"] as CaseRecord["status"][]
          ).includes(c.status);
          return (
        <Tabs defaultValue="overview" className="p-4">
          <TabsList>
            <TabsTrigger value="overview">Case overview</TabsTrigger>
            {showResponses && <TabsTrigger value="responses">Responses</TabsTrigger>}
            <TabsTrigger value="timeline">Workflow timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-4">
            <Section title="Company data">
              <Field label="Company name" value={c.companyData.companyName} />
              <Field label="Registration #" value={c.companyData.registrationNumber} />
              <Field label="Country" value={c.companyData.country} />
              <Field label="Risk rating" value={c.companyData.riskRating} />
              <Field
                label="Recipient email(s)"
                value={
                  c.companyData.recipientEmails.length
                    ? c.companyData.recipientEmails.join(", ")
                    : "—"
                }
              />
              <Field label="Incorporated" value={c.companyData.additionalFields.incorporationDate} />
              <Field label="Legal structure" value={c.companyData.additionalFields.legalStructure} />
              <Field label="Industry" value={c.companyData.additionalFields.primaryIndustry} />
            </Section>

            <Section title="Completion">
              <Field
                label="Mandatory"
                value={
                  completion.mandatory.total
                    ? `${completion.mandatory.done}/${completion.mandatory.total} (${completion.mandatoryPct}%)`
                    : "—"
                }
              />
              <Field
                label="Optional"
                value={
                  completion.optional.total
                    ? `${completion.optional.done}/${completion.optional.total} (${completion.optionalPct}%)`
                    : "—"
                }
              />
              <Field label="Overall" value={`${completion.overallPct}%`} />
            </Section>

          </TabsContent>

          {showResponses && (
            <TabsContent value="responses" className="mt-4">
              <ResponsesReview responses={c.responses} companyName={companyName} />
            </TabsContent>
          )}

          <TabsContent value="timeline" className="mt-4">
            <Section title="Workflow timeline">
              <ol className="space-y-2">
                {WORKFLOW_STEPS.map((name, idx) => {
                  const num = idx + 1;
                  const state = resolveWorkflowStepState(num, timeline.currentStep);
                  const ts = timeline.completedAt[idx];
                  return (
                    <li key={num} className="flex items-start gap-3">
                      <span className="mt-0.5">
                        {state === "done" && (
                          <span className="h-5 w-5 rounded-full bg-status-completed-bg text-status-completed-fg flex items-center justify-center">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                        {state === "current" && (
                          <span className="h-5 w-5 rounded-full bg-status-progress-bg text-status-progress-fg flex items-center justify-center">
                            <Loader2 className="h-3 w-3 animate-spin" />
                          </span>
                        )}
                        {state === "todo" && (
                          <span className="h-5 w-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                            <Circle className="h-2 w-2" />
                          </span>
                        )}
                      </span>
                      <div className="flex-1">
                        <div className="text-sm">
                          <span className="text-muted-foreground mr-1">Step {num}.</span>
                          {name}
                        </div>
                        {state === "done" && ts && (
                          <div className="text-xs text-muted-foreground">{ts}</div>
                        )}
                        {state === "current" && (
                          <div className="text-xs text-status-progress-fg italic">In progress</div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Section>
          </TabsContent>
        </Tabs>
          );
        })()}
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-2">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Field({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="text-foreground break-words">{value}</div>
    </div>
  );
}
