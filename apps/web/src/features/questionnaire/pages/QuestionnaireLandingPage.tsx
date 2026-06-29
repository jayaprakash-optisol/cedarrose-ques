import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { questionnaireService } from "@/services";
import type { QSessionState } from "@/types/questionnaire";
import { QuestionnaireShell } from "../components/QuestionnaireShell";
import bgImage from "@/assets/cedar-rose-bg.jpg";

const SESSION_KEY = (token: string) => `q_session_${token}`;

export default function QuestionnaireLandingPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [verifying, setVerifying] = useState(true);
  const [sending, setSending] = useState(false);
  const [state, setState] = useState<QSessionState | null>(null);

  useEffect(() => {
    if (!token) return;

    const stored = sessionStorage.getItem(SESSION_KEY(token));
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as QSessionState;
        if (parsed.sessionToken) {
          navigate(`/q/${token}/form`, { replace: true });
          return;
        }
        setState(parsed);
        setVerifying(false);
        return;
      } catch {
        sessionStorage.removeItem(SESSION_KEY(token));
      }
    }

    questionnaireService
      .verifyLink(token)
      .then((result) => {
        const session: QSessionState = {
          caseId: result.caseId,
          subjectName: result.subjectName,
          recipientType: result.recipientType,
          maskedEmail: result.maskedEmail,
        };
        sessionStorage.setItem(SESSION_KEY(token), JSON.stringify(session));
        setState(session);
      })
      .catch(() => {
        navigate(`/q/${token}/expired`, { replace: true });
      })
      .finally(() => setVerifying(false));
  }, [token, navigate]);

  const handleSendCode = async () => {
    if (!token || !state) return;
    setSending(true);
    try {
      await questionnaireService.requestOtp(token);
      navigate(`/q/${token}/otp`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send verification code.");
    } finally {
      setSending(false);
    }
  };

  if (verifying) {
    return (
      <QuestionnaireShell backgroundImage={bgImage}>
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-cr-indigo)]" />
          <p className="text-sm text-[var(--color-cr-secondary)]">Verifying your secure link…</p>
        </div>
      </QuestionnaireShell>
    );
  }

  return (
    <QuestionnaireShell backgroundImage={bgImage}>
      <div className="text-center mb-10">
        <p className="text-2xl sm:text-3xl font-semibold text-[var(--color-cr-navy)] leading-snug tracking-tight">
          Data You Can Trust,
          <br />
          Business Intelligence You Can Rely On
        </p>
      </div>

      <div className="max-w-xl w-full text-center bg-white/95 backdrop-blur border border-[var(--color-cr-border)] rounded-2xl shadow p-10">
        <h1 className="text-3xl font-bold text-[var(--color-cr-navy)]">Credit Information Request</h1>
        <p className="text-[var(--color-cr-secondary)] mt-3 text-sm leading-relaxed">
          A secure one-time password (OTP) will be sent to your registered email address to verify
          your identity before accessing the form.
        </p>

        <button
          type="button"
          onClick={handleSendCode}
          disabled={sending || !state}
          className="inline-flex items-center justify-center gap-2 mt-6 h-11 px-6 rounded-lg bg-[var(--color-cr-indigo)] text-white text-sm font-medium hover:bg-[var(--color-cr-indigo-hover)] disabled:opacity-90 disabled:cursor-not-allowed min-w-[240px]"
        >
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              Send verification code <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="mt-4 text-[12px] text-[var(--color-cr-secondary)]">
          🔒 This form is secured. Your responses are encrypted and confidential.
        </p>
      </div>
    </QuestionnaireShell>
  );
}
