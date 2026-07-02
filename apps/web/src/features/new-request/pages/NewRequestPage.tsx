import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Loader2, Check, AlertCircle, ArrowLeft, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { companyRequestsService, casesService, templatesService } from "@/services";
import { ApiError } from "@/services/api/client";
import type { CaseRecord, CompanyData, RecipientType } from "@/types/case";
import type { Template } from "@/types/template";
import type { CompanyRequestSummary } from "@/services/types";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const search = z.object({
  orderId: z.string().optional(),
  country: z.string().optional(),
  subject: z.string().optional(),
});


type Step = "A" | "B" | "C";

function riskRatingBadgeClass(riskRating: string | null | undefined): string {
  if (riskRating === "High") return "bg-status-abandoned-bg text-status-abandoned-fg";
  if (riskRating === "Medium") return "bg-status-pending-bg text-status-pending-fg";
  return "bg-status-completed-bg text-status-completed-fg";
}

function getActiveTemplateForRecipient(templates: Template[], recipientType: RecipientType) {
  return templates.find((t) => t.recipientType === recipientType && t.status === "Active");
}

export default function NewRequestPage() {
  const [searchParams] = useSearchParams();
  const sp = search.parse({
    orderId: searchParams.get("orderId") ?? undefined,
    country: searchParams.get("country") ?? undefined,
    subject: searchParams.get("subject") ?? undefined,
  });
  const [step, setStep] = useState<Step>(sp.orderId ? "B" : "A");

  const [orderId, setOrderId] = useState(sp.orderId ?? "");
  const [country, setCountry] = useState(sp.country ?? "");
  const [subject, setSubject] = useState(sp.subject ?? "");

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [createdCase, setCreatedCase] = useState<CaseRecord | null>(null);

  const [recipientType, setRecipientType] = useState<RecipientType>("Supplier");
  const auth: "OTP" | "Password" | "One-time link" = "OTP";
  const [expiry, setExpiry] = useState("48");
  const autoFetchAttempted = useRef(false);

  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: () => templatesService.list(),
  });

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["company-requests", "pending"],
    queryFn: () => companyRequestsService.listPending(),
  });

  const activeTemplate = useMemo(
    () => getActiveTemplateForRecipient(templates, recipientType),
    [templates, recipientType],
  );

  const { data: templateDetail } = useQuery({
    queryKey: ["templates", activeTemplate?.id],
    queryFn: () => templatesService.getById(activeTemplate!.id),
    enabled: !!activeTemplate?.id && step === "B",
  });

  const templateQuestions = useMemo(
    () => templateDetail?.sections.flatMap((section) => section.questions) ?? [],
    [templateDetail],
  );

  const fetchData = async (cr: CompanyRequestSummary) => {
    setLoading(true);
    setError(null);
    try {
      const data = await companyRequestsService.getById(cr.companyRequestId);
      setCompany(data);
      setSelectedRequestId(cr.companyRequestId);
      setOrderId(cr.orderId);
      setSubject(data.companyName);
      if (!country) setCountry(data.country);
      setStep("B");
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Could not retrieve company data. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetchAttempted.current || step !== "B" || company || loading) return;
    if (!sp.orderId) return;
    autoFetchAttempted.current = true;
    if (pendingRequests.length > 0) {
      void fetchData(pendingRequests[0]);
    }
  }, [step, company, loading, sp.orderId, pendingRequests]);

  const send = async () => {
    if (!company || !selectedRequestId) return;
    if (!activeTemplate) {
      toast.error(
        `No active template is available for ${recipientType}. Add and activate a template in Form Builder before sending.`,
      );
      return;
    }
    setSending(true);
    try {
      const result = await casesService.create({
        orderId,
        companyRequestId: selectedRequestId,
        subjectName: company.companyName,
        country: country || company.country,
        recipientType,
        recipientEmail: company.recipientEmails[0],
        linkValidityHours: Number(expiry),
      });
      setCreatedCase(result);
      setStep("C");
      toast.success("Secure link sent to recipient.");
    } catch (e) {
      if (e instanceof ApiError && e.code === "TEMPLATE_NOT_AVAILABLE") {
        toast.error(e.message);
      } else {
        toast.error(e instanceof ApiError ? e.message : "Failed to create case.");
      }
    } finally {
      setSending(false);
    }
  };

  const emailWarning = company?.recipientEmails.find((e) => /\.con$|\.cm$|@gmial\./i.test(e));

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">New questionnaire request</h2>
          <p className="text-sm text-muted-foreground">Workflow steps 1 → 6: order intake through secure link delivery.</p>
        </div>

        <Stepper step={step} />

        {step === "A" && (
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h3 className="text-sm font-semibold">Step A — Select incoming company request</h3>
            <p className="text-sm text-muted-foreground">
              Choose a pending company request that was received from the integration webhook.
            </p>

            {pendingRequests.length === 0 ? (
              <div className="rounded-md bg-status-pending-bg text-status-pending-fg p-3 text-sm flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>No pending company requests. New requests arrive via the webhook integration.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingRequests.map((cr) => (
                  <button
                    key={cr.companyRequestId}
                    onClick={() => fetchData(cr)}
                    disabled={loading}
                    className="w-full text-left rounded-md border border-border bg-background p-3 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium">{cr.companyName}</p>
                        <p className="text-xs text-muted-foreground">
                          Order: {cr.orderId} • Ref: {cr.externalRef}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${riskRatingBadgeClass(cr.riskRating)}`}>
                          {cr.riskRating ?? "—"}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Country: {cr.country}
                      {cr.recipientType ? ` • Type: ${cr.recipientType}` : ""}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {error && (
              <div className="rounded-md bg-status-abandoned-bg text-status-abandoned-fg p-3 text-sm flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <div className="flex-1">{error}</div>
                <Button size="sm" variant="outline" onClick={() => setStep("A")}>Retry</Button>
              </div>
            )}
          </div>
        )}

        {step === "B" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-sm font-semibold mb-3">Step B — Review company data from webhook</h3>
              {company ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <Read label="Company name" value={company.companyName} />
                  <Read label="Registration #" value={company.registrationNumber} />
                  <Read label="Country" value={company.country} />
                  <Read label="Risk rating" value={company.riskRating} />
                  <Read label="Recipient email(s)" value={company.recipientEmails.join(", ")} />
                  <Read label="Incorporation date" value={company.additionalFields.incorporationDate} />
                  <Read label="Legal structure" value={company.additionalFields.legalStructure} />
                  <Read label="Primary industry" value={company.additionalFields.primaryIndustry} />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading company data…
                </div>
              )}
              {emailWarning && (
                <div className="mt-4 rounded-md bg-status-pending-bg text-status-pending-fg p-3 text-sm">
                  The email <strong>{emailWarning}</strong> appears to contain a typo. Please verify before sending.
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Recipient type</Label>
                <RadioGroup value={recipientType} onValueChange={(v) => setRecipientType(v as RecipientType)} className="flex gap-4 mt-2">
                  {(["Supplier", "Customer", "Partner", "Business Analytics Report"] as const).map((t) => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value={t} /> <span className="text-sm">{t}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              {!activeTemplate && (
                <div className="rounded-md bg-status-pending-bg text-status-pending-fg p-3 text-sm flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>
                    No active questionnaire template is configured for <strong>{recipientType}</strong>.
                    Add and activate one in Form Builder before you can send a link.
                  </p>
                </div>
              )}

              <Collapsible>
                <CollapsibleTrigger
                  className="text-sm text-navy hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed"
                  disabled={!activeTemplate}
                >
                  {activeTemplate
                    ? `Preview ${recipientType} template (${templateQuestions.length} questions)`
                    : `No ${recipientType} template available`}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  {activeTemplate ? (
                    <ul className="text-sm space-y-1 bg-secondary/50 rounded-md p-3">
                      {templateQuestions.map((q) => (
                        <li key={q.id}>
                          {q.required ? (
                            <>
                              <span className="text-status-abandoned-fg mr-1">*</span>
                              {q.text || "Untitled question"}
                            </>
                          ) : (
                            q.text || "Untitled question"
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground bg-secondary/50 rounded-md p-3">
                      Create an active template for this recipient type in Form Builder to preview questions here.
                    </p>
                  )}
                </CollapsibleContent>
              </Collapsible>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Authentication method</Label>
                  <RadioGroup value="OTP" className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="OTP" /> <span className="text-sm">OTP</span>
                    </label>
                  </RadioGroup>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Link expiry</Label>
                  <Select value={expiry} onValueChange={setExpiry}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">24 hours</SelectItem>
                      <SelectItem value="48">48 hours</SelectItem>
                      <SelectItem value="72">72 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep("A")}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
                <Button
                  onClick={send}
                  disabled={!company || sending || !activeTemplate}
                  className="bg-navy hover:bg-navy/90 text-white"
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…
                    </>
                  ) : (
                    "Confirm & send link"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "C" && company && (
          <div className="rounded-lg border border-border bg-card p-8 text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-status-completed-bg text-status-completed-fg flex items-center justify-center">
              <Check className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold">Secure link sent</h3>
            <p className="text-sm text-muted-foreground">
              Link delivered to <strong>{company.recipientEmails[0]}</strong>
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm text-left max-w-md mx-auto bg-secondary/50 rounded-md p-4">
              <Read label="Order ID" value={orderId} />
              <Read label="Subject" value={subject} />
              <Read label="Expires in" value={`${expiry} hours`} />
              <Read label="Auth method" value={auth} />
              <Read label="Template" value={activeTemplate?.name ?? `${recipientType} questionnaire`} />
            </div>

            {/* Questionnaire link — shown once at creation */}
            {createdCase?.linkUrl && (
              <div className="max-w-md mx-auto space-y-2">
                <p className="text-xs text-muted-foreground font-medium text-left">Questionnaire link</p>
                <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
                  <span className="flex-1 text-xs font-mono text-foreground truncate">{createdCase.linkUrl}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(createdCase.linkUrl!);
                      toast.success("Link copied to clipboard.");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <a href={createdCase.linkUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost" className="h-7 px-2 shrink-0">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                </div>
                <p className="text-[11px] text-muted-foreground text-left">
                  Share this link with the recipient or open it to test the questionnaire flow.
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-center pt-2">
              <Link to="/cases"><Button variant="outline">View case in All Cases</Button></Link>
              <Button onClick={() => { setStep("A"); setCompany(null); setCreatedCase(null); setSelectedRequestId(null); setOrderId(""); setSubject(""); setCountry(""); }} className="bg-navy hover:bg-navy/90 text-white">
                Trigger another request
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Stepper({ step }: Readonly<{ step: Step }>) {
  const steps: { id: Step; label: string }[] = [
    { id: "A", label: "Select request" },
    { id: "B", label: "Review & configure" },
    { id: "C", label: "Confirm & send" },
  ];
  const order = ["A", "B", "C"];
  const idx = order.indexOf(step);
  return (
    <ol className="flex items-center gap-2">
      {steps.map((s, i) => {
        const done = i < idx;
        const current = i === idx;
        const circleStyle: React.CSSProperties = done || current
          ? { backgroundColor: "#2B3178", color: "#FFFFFF" }
          : { backgroundColor: "#E2E8F0", color: "#4A5568" };
        const labelStyle: React.CSSProperties = done || current
          ? { color: "#1A202C" }
          : { color: "#4A5568" };
        const connectorColor = done ? "#2B3178" : "#CBD5E0";
        return (
          <li key={s.id} className="flex items-center gap-2">
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold"
              style={circleStyle}
            >
              {done ? <Check className="h-4 w-4" /> : s.id}
            </div>
            <span
              className="text-sm"
              style={{ ...labelStyle, fontWeight: current ? 600 : 500 }}
            >{s.label}</span>
            {i < steps.length - 1 && (
              <div className="h-px w-8 mx-2" style={{ backgroundColor: connectorColor }} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Read({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}
