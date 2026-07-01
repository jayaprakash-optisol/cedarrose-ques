import { AlertTriangle } from "lucide-react";
import { QuestionnaireShell } from "../components/QuestionnaireShell";

export default function QuestionnaireExpiredPage() {
  return (
    <QuestionnaireShell title="Credit Information Request Questionnaire">
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
          This link is no longer valid
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The page you opened is not active. Please open the secure questionnaire link directly
          from the email Cedar Rose sent you.
        </p>

        <div
          className="mt-8 rounded-lg px-4 py-3 text-xs text-left"
          style={{ backgroundColor: "#FFF7ED", color: "#92400E" }}
        >
          <p className="font-semibold mb-2">What to do next</p>
          <ul className="list-disc pl-5 space-y-1.5 leading-snug">
            <li>Return to your inbox and find the questionnaire email from Cedar Rose.</li>
            <li>Click the secure link in that message. Do not use an old bookmark or copied URL.</li>
            <li>Complete verification with the one-time code sent to your email.</li>
          </ul>
        </div>
      </div>
    </QuestionnaireShell>
  );
}
