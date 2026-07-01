import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Info, X, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { questionnaireService } from "@/services";
import type { FormResponse, QSessionState, QuestionnaireFormData } from "@/types/questionnaire";
import {
  clearQuestionnaireSessionToken,
  isSessionExpiredError,
  questionnaireSessionKey,
} from "@/lib/questionnaire-session";
import type { Section } from "@/types/template";
import { QuestionnaireShell } from "../components/QuestionnaireShell";
import { SectionNavigator } from "../components/SectionNavigator";
import { QuestionField } from "../components/QuestionField";
import { SaveIndicator } from "../components/SaveIndicator";
import { Button } from "@/components/ui/button";

const SESSION_KEY = questionnaireSessionKey;

// ---------------------------------------------------------------------------
// Debounce helper
// ---------------------------------------------------------------------------
function useDebouncedCallback<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): T {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    ((...args) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fn(...args), delay);
    }) as T,
    [fn, delay]
  );
}

// ---------------------------------------------------------------------------
// Section completion check
// ---------------------------------------------------------------------------
function sectionCompletion(section: Section, responses: Record<string, string>) {
  const mandatory = section.questions.filter((q) => q.required);
  const answered = mandatory.filter((q) => (responses[q.id] ?? "").trim().length > 0);
  return { done: answered.length, total: mandatory.length };
}

// ---------------------------------------------------------------------------
// Map responses record → FormResponse array
// ---------------------------------------------------------------------------
function toFormResponses(
  responses: Record<string, string>,
  sections: Section[]
): FormResponse[] {
  const result: FormResponse[] = [];
  for (const section of sections) {
    for (const q of section.questions) {
      const answer = responses[q.id] ?? "";
      result.push({
        questionId: q.id,
        sectionId: section.id,
        question: q.text,
        answer,
        mandatory: q.required,
      });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function QuestionnaireFormPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<QSessionState | null>(null);
  const [formData, setFormData] = useState<QuestionnaireFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [showRestoredBanner, setShowRestoredBanner] = useState(false);

  const redirectToSessionExpired = useCallback(() => {
    if (!token) return;
    clearQuestionnaireSessionToken(token);
    navigate(`/q/${token}/session-expired`, { replace: true });
  }, [token, navigate]);

  const handleQuestionnaireError = useCallback(
    (err: unknown) => {
      if (isSessionExpiredError(err)) {
        redirectToSessionExpired();
        return true;
      }
      return false;
    },
    [redirectToSessionExpired],
  );

  // Load session
  useEffect(() => {
    if (!token) return;
    const stored = sessionStorage.getItem(SESSION_KEY(token));
    if (!stored) { navigate(`/q/${token}`, { replace: true }); return; }
    try {
      const parsed = JSON.parse(stored) as QSessionState;
      if (!parsed.sessionToken) { navigate(`/q/${token}/otp`, { replace: true }); return; }
      setSession(parsed);
    } catch {
      navigate(`/q/${token}`, { replace: true });
    }
  }, [token, navigate]);

  // Load form data
  useEffect(() => {
    if (!token || !session?.sessionToken) return;
    setLoading(true);
    questionnaireService
      .getForm(token, session.sessionToken)
      .then((data) => {
        setFormData(data);
        // Restore saved responses
        if (data.savedResponses && data.savedResponses.length > 0) {
          const restored: Record<string, string> = {};
          for (const r of data.savedResponses) {
            if (r.questionId) restored[r.questionId] = r.answer;
          }
          setResponses(restored);
          setSavedAt(new Date(session.savedAt ?? Date.now()));
          setShowRestoredBanner(true);
        }
      })
      .catch((err) => {
        if (handleQuestionnaireError(err)) return;
        toast.error("Failed to load the form. Please refresh the page.");
      })
      .finally(() => setLoading(false));
  }, [token, session, handleQuestionnaireError]);

  // Persist save
  const persistSave = useCallback(
    async (resp: Record<string, string>) => {
      if (!token || !session?.sessionToken || !formData) return;
      setIsSaving(true);
      try {
        const payload = toFormResponses(resp, formData.template.sections);
        await questionnaireService.saveProgress(token, session.sessionToken, payload);
        const now = new Date();
        setSavedAt(now);
        // Update sessionStorage with savedAt
        const updated: QSessionState = { ...session, savedAt: now.toISOString() };
        sessionStorage.setItem(SESSION_KEY(token), JSON.stringify(updated));
        setSession(updated);
      } catch (err) {
        if (!handleQuestionnaireError(err)) {
          // Silent fail — don't disrupt user
        }
      } finally {
        setIsSaving(false);
      }
    },
    [token, session, formData, handleQuestionnaireError]
  );

  const debouncedSave = useDebouncedCallback(persistSave, 2000);

  const handleFieldChange = (questionId: string, value: string) => {
    setResponses((prev) => {
      const next = { ...prev, [questionId]: value };
      debouncedSave(next);
      return next;
    });
  };

  const handleManualSave = () => persistSave(responses);

  const handleSubmit = async () => {
    if (!token || !session?.sessionToken) return;
    setSubmitting(true);
    try {
      await persistSave(responses);
      await questionnaireService.submit(token, session.sessionToken);
      setSubmitted(true);
      sessionStorage.removeItem(SESSION_KEY(token));
    } catch (err) {
      if (!handleQuestionnaireError(err)) {
        toast.error("Submission failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------
  const sections = formData?.template.sections ?? [];
  const totalSections = sections.length;
  const section = sections[currentSection] ?? null;

  const completedSections = useMemo(() => {
    const done = new Set<number>();
    for (let i = 0; i < sections.length; i++) {
      const { done: d, total } = sectionCompletion(sections[i], responses);
      if (total === 0 || d === total) done.add(i);
    }
    return done;
  }, [sections, responses]);

  const currentCompletion = section ? sectionCompletion(section, responses) : { done: 0, total: 0 };

  // Overall progress
  const overallPct = useMemo(() => {
    let totalMandatory = 0;
    let totalAnswered = 0;
    for (const s of sections) {
      for (const q of s.questions) {
        if (q.required) {
          totalMandatory++;
          if ((responses[q.id] ?? "").trim().length > 0) totalAnswered++;
        }
      }
    }
    return totalMandatory === 0 ? 0 : Math.round((totalAnswered / totalMandatory) * 100);
  }, [sections, responses]);

  const canAdvance =
    !section ||
    section.questions
      .filter((q) => q.required)
      .every((q) => (responses[q.id] ?? "").trim().length > 0);

  const isLastSection = currentSection === totalSections - 1;

  // ---------------------------------------------------------------------------
  // Render — success screen
  // ---------------------------------------------------------------------------
  if (submitted) {
    return (
      <QuestionnaireShell title="Credit Information Request Questionnaire">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg px-8 py-12 text-center">
          <div
            className="mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-6"
            style={{ backgroundColor: "#DCFCE7" }}
          >
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-3" style={{ color: "#1E2561" }}>
            Questionnaire Submitted
          </h2>
          <p className="text-sm text-muted-foreground mb-2">
            Thank you for completing the questionnaire.
          </p>
          <p className="text-sm text-muted-foreground">
            Your responses have been securely received. The Cedar Rose team will review your
            submission and contact you if further information is required.
          </p>
        </div>
      </QuestionnaireShell>
    );
  }

  // ---------------------------------------------------------------------------
  // Render — loading
  // ---------------------------------------------------------------------------
  if (loading || !formData || !section) {
    return (
      <QuestionnaireShell title="Credit Information Request Questionnaire">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#4F46E5" }} />
          <p className="text-sm text-muted-foreground">Loading your questionnaire…</p>
        </div>
      </QuestionnaireShell>
    );
  }

  // ---------------------------------------------------------------------------
  // Render — form
  // ---------------------------------------------------------------------------
  return (
    <QuestionnaireShell title="Credit Information Request Questionnaire">
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-4">
        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>
              Section {currentSection + 1} of {totalSections} — {section.title} ·{" "}
              {currentCompletion.done} of {currentCompletion.total} fields complete
            </span>
            <span className="font-semibold" style={{ color: "#1E2561" }}>
              {overallPct}% complete
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${overallPct}%`, backgroundColor: "#1E2561" }}
            />
          </div>
        </div>

        {/* Section navigator */}
        <SectionNavigator
          total={totalSections}
          current={currentSection}
          completed={completedSections}
          onNavigate={setCurrentSection}
        />

        {/* Restored banner */}
        {showRestoredBanner && (
          <div
            className="flex items-start gap-3 rounded-lg px-4 py-3 text-sm"
            style={{ backgroundColor: "#EFF6FF", borderLeft: "3px solid #3B82F6", color: "#1D4ED8" }}
          >
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="flex-1">
              Welcome back. Your progress has been restored from your last session.{" "}
              <span className="text-xs opacity-70">
                Last saved: {savedAt?.toLocaleString()}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowRestoredBanner(false)}
              className="text-blue-400 hover:text-blue-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Section card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Section header */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden>🏢</span>
                <h2 className="text-lg font-bold" style={{ color: "#1E2561" }}>
                  Section {currentSection + 1} · {section.title}
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">
                {currentCompletion.done} of {currentCompletion.total} fields complete
              </span>
            </div>
            {section.description && (
              <p className="mt-2 text-sm text-muted-foreground">{section.description}</p>
            )}
            {section.banner && (
              <div className="mt-3 text-xs text-muted-foreground italic">{section.banner}</div>
            )}
          </div>

          {/* Questions */}
          <div className="px-6 py-6 space-y-6">
            <p className="text-xs italic text-muted-foreground">
              * Required fields must be completed before you can proceed to the next section.
            </p>

            {section.questions.map((question) => (
              <div key={question.id} className="space-y-1.5">
                <div className="flex items-baseline gap-2">
                  <label className="text-sm font-semibold" style={{ color: "#2D3748" }}>
                    {question.text}
                    {question.required && (
                      <span className="text-red-500 ml-0.5">*</span>
                    )}
                  </label>
                  {!question.required && (
                    <span
                      className="text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
                    >
                      OPTIONAL
                    </span>
                  )}
                </div>
                {question.helpText && (
                  <p className="text-xs text-muted-foreground">{question.helpText}</p>
                )}
                <QuestionField
                  question={question}
                  value={responses[question.id] ?? ""}
                  onChange={(val) => handleFieldChange(question.id, val)}
                  disabled={submitting}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-4 pb-8">
          <Button
            variant="outline"
            onClick={() => setCurrentSection((s) => Math.max(0, s - 1))}
            disabled={currentSection === 0 || submitting}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Previous
          </Button>

          <Button
            variant="outline"
            onClick={handleManualSave}
            disabled={isSaving || submitting}
            className="flex items-center gap-1.5"
          >
            <Save className="h-4 w-4" />
            Save progress
          </Button>

          <div className="flex-1 flex justify-center">
            <SaveIndicator isSaving={isSaving} savedAt={savedAt} />
          </div>

          {isLastSection ? (
            <Button
              onClick={handleSubmit}
              disabled={!canAdvance || submitting}
              className="text-white"
              style={{ backgroundColor: "#1E2561" }}
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</>
              ) : (
                "Submit questionnaire"
              )}
            </Button>
          ) : (
            <Button
              onClick={() => {
                if (!canAdvance) {
                  toast.error("Please complete all required fields before proceeding.");
                  return;
                }
                setCurrentSection((s) => s + 1);
              }}
              className="text-white"
              style={{ backgroundColor: "#1E2561" }}
            >
              Save & Continue <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </QuestionnaireShell>
  );
}
