import { useState } from "react";
import { X, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import type { CaseRecord } from "@/types/case";
import { Button } from "@/components/ui/button";
import { casesService } from "@/services";
import { ApiError } from "@/services/api/client";
import { caseCompanyName, caseCrisUid } from "@/lib/case-display";

interface Props {
  case: CaseRecord;
  open: boolean;
  onClose: () => void;
  onConfirmed: () => void;
  onViewDetails: () => void;
}

export function ResendLinkModal({ case: c, open, onClose, onConfirmed, onViewDetails }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  if (!open) return null;

  const email = c.companyData.recipientEmails[0] ?? "—";
  const newExpiry = format(new Date(Date.now() + 10 * 86_400_000), "dd MMM yyyy");
  const sentAt = c.link.sentAt ? format(new Date(c.link.sentAt), "dd MMM yyyy") : "—";
  const expiredOn = c.linkExpiry ? format(new Date(c.linkExpiry), "dd MMM yyyy") : "—";

  const handleResend = async () => {
    setState("loading");
    setErrorMessage("");
    try {
      await casesService.resendLink(c.id);
      setState("success");
    } catch (err) {
      setState("error");
      setErrorMessage(err instanceof ApiError ? err.message : "Failed to resend link.");
    }
  };

  const handleClose = () => {
    if (state === "success") onConfirmed();
    setState("idle");
    setErrorMessage("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={handleClose}>
      <div
        className="w-[480px] max-w-full rounded-xl bg-card shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {state === "success" ? (
          <div className="p-8 text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold">Link resent successfully</h3>
            <p className="text-sm text-muted-foreground">
              A new questionnaire link has been sent to <span className="font-medium text-foreground">{email}</span>.
              The link will expire on <span className="font-medium text-foreground">{newExpiry}</span>.
            </p>
            <Button variant="outline" className="w-full" onClick={handleClose}>Close</Button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between p-5 border-b border-border">
              <div>
                <h3 className="text-base font-semibold">Resend questionnaire link</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Review the details below before resending.</p>
              </div>
              <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-lg bg-secondary/60 p-4 space-y-2">
                <div className="font-semibold text-base">{caseCompanyName(c)}</div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-mono">{caseCrisUid(c)}</span> · <span className="font-mono">{c.orderId}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs pt-2">
                  <Row label="Country" value={c.country} />
                  <Row label="Recipient type" value={c.recipientType} />
                  <Row label="Contact email" value={email} />
                  <Row label="Original sent" value={sentAt} />
                  <Row label="Expired on" value={expiredOn} valueClass="text-destructive font-medium" />
                  <Row label="Previous link opens" value={c.link.firstOpenedAt ? "1" : "0"} />
                  <Row label="Times resent" value={String(c.link.resentCount)} />
                </div>
              </div>

              <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-800 text-xs px-3 py-2 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  The previous link has expired. A new tokenized link will be generated and sent to the email above.
                  The expiry clock will reset to 10 days from today.
                </span>
              </div>
            </div>

            <div className="px-5 pb-5 space-y-3">
              {state === "error" && (
                <p className="text-xs text-destructive text-center">{errorMessage}</p>
              )}
              <Button
                className="w-full bg-navy hover:bg-navy/90 text-white"
                onClick={handleResend}
                disabled={state === "loading"}
              >
                {state === "loading" ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Resending…</>
                ) : "Resend questionnaire link"}
              </Button>
              <button
                onClick={() => { onClose(); setState("idle"); onViewDetails(); }}
                className="w-full text-xs text-navy hover:underline text-center"
              >
                View full case details →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}:</span>
      <span className={`text-foreground text-right truncate ${valueClass}`}>{value}</span>
    </div>
  );
}
