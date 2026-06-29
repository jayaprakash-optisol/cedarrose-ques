import { AlertTriangle } from "lucide-react";
import { QuestionnaireShell } from "../components/QuestionnaireShell";

export default function QuestionnaireExpiredPage() {
  return (
    <QuestionnaireShell>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg px-8 py-12 text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#FEF2F2" }}
          >
            <AlertTriangle className="h-8 w-8" style={{ color: "#EF4444" }} />
          </div>
        </div>

        <h2 className="text-xl font-bold mb-3" style={{ color: "#1E2561" }}>
          This link has expired
        </h2>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          The secure link you followed is no longer valid. Links expire after the validity period
          set by your requester.
        </p>
        <p className="text-sm text-muted-foreground">
          If you believe this is an error, please contact the sender and request a new link.
        </p>

        <div
          className="mt-8 rounded-lg px-4 py-3 text-xs text-left"
          style={{ backgroundColor: "#FFF7ED", color: "#92400E" }}
        >
          <strong>Why did this happen?</strong>
          <ul className="mt-1 list-disc list-inside space-y-1 text-xs">
            <li>The link may have been open for longer than the allowed time.</li>
            <li>Each link can only be used once after OTP verification.</li>
            <li>Links are invalidated if a new one is issued for the same case.</li>
          </ul>
        </div>
      </div>
    </QuestionnaireShell>
  );
}
