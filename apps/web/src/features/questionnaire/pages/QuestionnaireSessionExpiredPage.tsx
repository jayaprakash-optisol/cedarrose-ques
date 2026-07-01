import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { Clock } from "lucide-react";
import { QuestionnaireShell } from "../components/QuestionnaireShell";
import { clearQuestionnaireSessionToken } from "@/lib/questionnaire-session";

export default function QuestionnaireSessionExpiredPage() {
  const { token } = useParams<{ token: string }>();

  useEffect(() => {
    if (token) clearQuestionnaireSessionToken(token);
  }, [token]);

  return (
    <QuestionnaireShell title="Credit Information Request Questionnaire">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg px-8 py-12 text-center">
        <div className="flex justify-center mb-6">
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#FEF3C7" }}
          >
            <Clock className="h-8 w-8" style={{ color: "#D97706" }} />
          </div>
        </div>

        <h2 className="text-xl font-bold mb-3" style={{ color: "#1E2561" }}>
          Your session has expired
        </h2>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          For your security, questionnaire sessions time out after a short period of inactivity.
          Please open the secure questionnaire link from your email again to continue.
        </p>
        <p className="text-sm text-muted-foreground">
          A new verification code will be sent to your registered email address. Your saved answers
          are still stored — you will not need to start from scratch.
        </p>

        <div
          className="mt-8 rounded-lg px-4 py-3 text-xs text-left"
          style={{ backgroundColor: "#FFF7ED", color: "#92400E" }}
        >
          <p className="font-semibold mb-2">What to do next</p>
          <ul className="list-disc pl-5 space-y-1.5 leading-snug">
            <li>Return to the questionnaire email you received from Cedar Rose.</li>
            <li>Open the secure link in that message.</li>
            <li>Request a verification code and enter it to access your form again.</li>
          </ul>
        </div>
      </div>
    </QuestionnaireShell>
  );
}
