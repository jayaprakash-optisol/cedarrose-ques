import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, ClipboardList, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/app/auth-context";
import { env } from "@/config/env";
import { completeLogout } from "@/lib/auth-session";
import { setAppSelected } from "@/lib/app-selection";

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function SelectAppPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const firstName = user?.name.split(" ")[0] ?? "there";
  const initials = user?.initials ?? firstName.slice(0, 2).toUpperCase();
  const greeting = greetingForHour(new Date().getHours());
  const qaAutomationUrl = env.qaAutomationUrl;

  const handleSignOut = async () => {
    await completeLogout(queryClient);
    navigate("/login", { replace: true });
  };

  const openQuestionnaire = () => {
    setAppSelected("questionnaire");
    navigate("/", { replace: true });
  };

  const openAutomation = () => {
    if (!qaAutomationUrl) {
      toast.message("QA Automation URL is not configured.");
      return;
    }
    setAppSelected("automation");
    window.location.assign(qaAutomationUrl);
  };

  return (
    <div className="min-h-screen bg-[var(--color-cr-bg)]">
      <header className="h-[60px] bg-[var(--color-cr-navy)] flex items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center bg-white/10 text-white font-bold rounded-lg"
            style={{ width: 36, height: 36, fontSize: 14 }}
          >
            CR
          </div>
          <span className="text-white text-[15px] font-medium">Cedar Rose</span>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-full bg-[var(--color-cr-indigo)] text-white text-[12px] font-semibold"
            style={{ width: 32, height: 32 }}
          >
            {initials}
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-white text-[13px]">{user?.name ?? "User"}</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-white/60 text-[12px] text-left hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-6 pt-20 pb-16">
        <h1 className="text-[28px] font-bold text-[var(--color-cr-heading)]">
          {greeting}, {firstName}.
        </h1>
        <p className="mt-2 text-[15px] text-[var(--color-cr-secondary)]">
          You have access to both Cedar Rose platforms. Select one to continue.
        </p>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <AppCard
            onClick={openAutomation}
            icon={<BarChart3 size={28} className="text-[var(--color-cr-indigo)]" />}
            title="QA Automation"
            description="Automated quality assurance workflows for credit reports and data accuracy."
            features={["Automated checks", "Issue tracking", "Audit trail"]}
            cta="Open QA Automation"
          />
          <AppCard
            onClick={openQuestionnaire}
            icon={<ClipboardList size={28} className="text-[var(--color-cr-indigo)]" />}
            title="QA Questionnaire"
            description="Structured questionnaires and reviewer workflows for in-depth analyst evaluations."
            features={["Custom forms", "Reviewer assignment", "Scoring & insights"]}
            cta="Open QA Questionnaire"
          />
        </div>
      </main>
    </div>
  );
}

function AppCard({
  onClick,
  icon,
  title,
  description,
  features,
  cta,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  cta: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group block w-full text-left rounded-2xl bg-white border-[1.5px] border-[var(--color-cr-border)] p-9 shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all duration-200 hover:border-[var(--color-cr-indigo)] hover:shadow-[0_4px_24px_rgba(79,70,229,0.12)] hover:-translate-y-0.5"
    >
      <div
        className="flex items-center justify-center rounded-xl bg-[var(--color-cr-indigo-soft)]"
        style={{ width: 56, height: 56 }}
      >
        {icon}
      </div>
      <h2 className="mt-5 text-[20px] font-bold text-[var(--color-cr-heading)]">{title}</h2>
      <p className="mt-2 text-[14px] text-[var(--color-cr-secondary)] leading-relaxed">{description}</p>

      <ul className="mt-5 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-[13px] text-[var(--color-cr-body)]">
            <CheckCircle2 size={15} className="text-[var(--color-cr-indigo)] shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      <div className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-cr-indigo)] group-hover:gap-2.5 transition-all">
        {cta}
        <ArrowRight size={15} />
      </div>
    </button>
  );
}
