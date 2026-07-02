import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ShieldCheck, Clock, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { questionnaireService } from "@/services";
import type { QSessionState } from "@/types/questionnaire";
import {
  questionnaireSessionKey,
  readQuestionnaireSession,
} from "@/lib/questionnaire-session";
import { QuestionnaireShell } from "../components/QuestionnaireShell";
import { OtpInputGroup } from "../components/OtpInputGroup";
import { cn } from "@/lib/utils";

const SESSION_KEY = questionnaireSessionKey;
const OTP_DURATION_SEC = 10 * 60;

function getTimerColor(secondsLeft: number): string {
  if (secondsLeft < 30) return "text-[var(--color-cr-error)]";
  if (secondsLeft < 120) return "text-[#D69E2E]";
  return "text-[var(--color-cr-secondary)]";
}

export default function QuestionnaireOtpPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<QSessionState | null>(null);
  const [digits, setDigits] = useState<string[]>(new Array(6).fill(""));
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resentToast, setResentToast] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(OTP_DURATION_SEC);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!token) return;
    const parsed = readQuestionnaireSession(token);
    if (!parsed) {
      navigate(`/q/${token}`, { replace: true });
      return;
    }
    setSession(parsed);
  }, [token, navigate]);

  const startTimer = useCallback(() => {
    setSecondsLeft(OTP_DURATION_SEC);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

  useEffect(() => {
    if (!resentToast) return;
    const id = setTimeout(() => setResentToast(false), 3000);
    return () => clearTimeout(id);
  }, [resentToast]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const timerColor = getTimerColor(secondsLeft);

  const handleVerify = async () => {
    if (!token || !session) return;
    const otp = digits.join("");
    if (otp.length < 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }
    setError(null);
    setVerifying(true);
    try {
      const result = await questionnaireService.verifyOtp(token, otp);
      const updated: QSessionState = { ...session, sessionToken: result.sessionToken };
      sessionStorage.setItem(SESSION_KEY(token), JSON.stringify(updated));
      navigate(`/q/${token}/form`);
    } catch (e) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 3) {
        setError("Too many incorrect attempts. Please request a new code.");
        setDigits(new Array(6).fill(""));
      } else {
        setError(
          e instanceof Error ? e.message : `Invalid code. ${3 - newAttempts} attempt(s) remaining.`,
        );
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!token || !session) return;
    setResending(true);
    setError(null);
    setDigits(new Array(6).fill(""));
    setAttempts(0);
    try {
      await questionnaireService.requestOtp(token);
      startTimer();
      setResentToast(true);
    } catch {
      toast.error("Failed to resend the code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const canVerify = digits.every((d) => d !== "") && !verifying && attempts < 3 && secondsLeft > 0;

  return (
    <QuestionnaireShell>
      <div
        className="w-full max-w-[480px] bg-white rounded-2xl shadow border border-[var(--color-cr-border)] text-center"
        style={{ padding: "40px 48px" }}
      >
        <div className="flex justify-center">
          <ShieldCheck className="w-12 h-12 text-[var(--color-cr-navy)]" strokeWidth={2} />
        </div>

        <h1 className="mt-4 text-[22px] font-bold text-[var(--color-cr-heading)]">
          Verify your identity
        </h1>
        <p className="mt-2 text-[14px] text-[var(--color-cr-secondary)]">We sent a 6-digit code to</p>
        <p className="text-[14px] font-semibold text-[var(--color-cr-body)]">
          {session?.maskedEmail ?? "your registered email"}
        </p>

        <div className="mt-7 flex justify-center">
          <OtpInputGroup
            value={digits}
            onChange={setDigits}
            disabled={verifying || attempts >= 3}
            hasError={!!error}
          />
        </div>

        <div className="mt-5 flex items-center justify-center gap-1.5 text-[13px]">
          <Clock className="w-3.5 h-3.5 text-[var(--color-cr-secondary)]" />
          {secondsLeft > 0 ? (
            <>
              <span className="text-[var(--color-cr-secondary)]">Code expires in </span>
              <span className={cn("font-semibold tabular-nums", timerColor)}>
                {formatTime(secondsLeft)}
              </span>
            </>
          ) : (
            <span className="text-[var(--color-cr-error)] font-semibold">Code expired</span>
          )}
        </div>

        <button
          type="button"
          onClick={handleVerify}
          disabled={!canVerify}
          className={cn(
            "mt-6 w-full h-12 rounded-lg text-[15px] font-medium text-white inline-flex items-center justify-center gap-2",
            canVerify
              ? "bg-[var(--color-cr-indigo)] hover:bg-[var(--color-cr-indigo-hover)]"
              : "bg-[var(--color-cr-input-border)] cursor-not-allowed",
          )}
        >
          {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & access form"}
        </button>

        {error && (
          <p className="mt-3 text-[13px] text-[var(--color-cr-error)] text-center">⚠ {error}</p>
        )}

        <div className="mt-4 text-center text-[13px]">
          <span className="text-[var(--color-cr-secondary)]">Didn't receive the code? </span>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-[var(--color-cr-indigo)] font-medium hover:underline inline-flex items-center gap-1.5"
          >
            {resending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Resend code
          </button>
          {resentToast && (
            <div className="mt-2 text-[12px] text-[#38A169] inline-flex items-center justify-center gap-1">
              <Check className="w-3.5 h-3.5" /> A new code has been sent.
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-[var(--color-cr-border)]">
          <p className="text-[11px] text-[var(--color-cr-muted)] text-center leading-relaxed">
            🔒 This link is unique to your questionnaire and cannot be shared. All access attempts
            are logged for security.
          </p>
        </div>
      </div>
    </QuestionnaireShell>
  );
}
