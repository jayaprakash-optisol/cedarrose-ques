import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Loader2, Check, AlertCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { companiesService, casesService } from "@/services";
import { ApiError } from "@/services/api/client";
import { COUNTRIES } from "@/config/workflow";
import type { CompanyData, RecipientType } from "@/types/case";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const TEMPLATE_QS: Record<RecipientType, string[]> = {
  Supplier: ["Confirm legal entity name *", "Beneficial owners (>25%) *", "Sanctions screening *", "AML / CTF policy *", "ISO certifications *", "ESG framework"],
  Customer: ["Primary contact *", "Annual purchase volume *", "Payment terms *", "Service quality feedback *", "NPS rating"],
  Partner: ["Legal name *", "Joint product lines *", "Revenue share *", "Conflict of interest disclosure *", "Press approval"],
  "Business Analytics Report": ["Reporting entity name *", "Reporting period *", "Revenue figures *", "Key performance indicators *", "Market segmentation", "Forward-looking statements"],
};

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
  const [uid, setUid] = useState("UID-44529");

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanyData | null>(null);

  const [recipientType, setRecipientType] = useState<RecipientType>("Supplier");
  const [auth, setAuth] = useState<"OTP" | "Password" | "One-time link">("OTP");
  const [expiry, setExpiry] = useState("48");
  const autoFetchAttempted = useRef(false);

  const fetchData = async () => {
    if (!orderId || !subject || !uid.trim()) {
      toast.error("Order ID, company name, and CRiS UID are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await companiesService.getByUid(uid.trim());
      setCompany(data);
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
    void fetchData();
  }, [step, company, loading, sp.orderId]);

  const send = async () => {
    if (!company) return;
    setSending(true);
    try {
      await casesService.create({
        orderId,
        uid: uid.trim(),
        subjectName: subject,
        country: country || company.country,
        recipientType,
        recipientEmail: company.recipientEmails[0],
        linkValidityHours: Number(expiry),
      });
      setStep("C");
      toast.success("Secure link sent to recipient.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to create case.");
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
            <h3 className="text-sm font-semibold">Step A — Enter order details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Company Name *">
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>
                    {["ABC Holdings Ltd", "Acme Trading LLC", "Globex Corporation", "Initech Partners", "Umbrella Group"].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Order ID *">
                <Select value={orderId} onValueChange={setOrderId}>
                  <SelectTrigger><SelectValue placeholder="Select order ID" /></SelectTrigger>
                  <SelectContent>
                    {["ORD-10001", "ORD-10002", "ORD-10003", "ORD-10004", "ORD-10005"].map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="CRiS UID *">
                <Input
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                  placeholder="UID-44529"
                />
              </Field>
            </div>
            {error && (
              <div className="rounded-md bg-status-abandoned-bg text-status-abandoned-fg p-3 text-sm flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <div className="flex-1">{error}</div>
                <Button size="sm" variant="outline" onClick={fetchData}>Retry</Button>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <Button onClick={fetchData} disabled={loading} className="bg-navy hover:bg-navy/90 text-white">
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Fetching…</> : "Fetch company data"}
              </Button>
            </div>
          </div>
        )}

        {step === "B" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-sm font-semibold mb-3">Step B — Review fetched company data</h3>
              {!company ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading company data…
                </div>
              ) : (
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

              <Collapsible>
                <CollapsibleTrigger className="text-sm text-navy hover:underline">
                  Preview {recipientType} template ({TEMPLATE_QS[recipientType].length} questions)
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <ul className="text-sm space-y-1 bg-secondary/50 rounded-md p-3">
                    {TEMPLATE_QS[recipientType].map((q) => (
                      <li key={q}>
                        {q.endsWith("*") ? (
                          <><span className="text-status-abandoned-fg mr-1">*</span>{q.replace(/\s\*$/, "")}</>
                        ) : q}
                      </li>
                    ))}
                  </ul>
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
                <Button onClick={send} disabled={!company || sending} className="bg-navy hover:bg-navy/90 text-white">
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
              <Read label="Template" value={`${recipientType} questionnaire`} />
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <Link to="/cases"><Button variant="outline">View case in All Cases</Button></Link>
              <Button onClick={() => { setStep("A"); setCompany(null); setOrderId(""); setSubject(""); setCountry(""); setUid("UID-44529"); }} className="bg-navy hover:bg-navy/90 text-white">
                Trigger another request
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "A", label: "Enter order details" },
    { id: "B", label: "Review fetched data" },
    { id: "C", label: "Confirm & send" },
  ];
  const order = ["A", "B", "C"];
  const idx = order.indexOf(step);
  return (
    <ol className="flex items-center gap-2">
      {steps.map((s, i) => {
        const done = i < idx;
        const current = i === idx;
        const circleStyle: React.CSSProperties = done
          ? { backgroundColor: "#2B3178", color: "#FFFFFF" }
          : current
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Read({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}
