import type { ReactNode } from "react";
import { CedarLogo } from "@/components/CedarLogo";

interface AuthPageShellProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  shake?: boolean;
}

export function AuthPageShell({ children, title, subtitle, shake = false }: AuthPageShellProps) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[var(--color-cr-navy)] flex items-center justify-center px-4">
      <div
        className="pointer-events-none absolute rounded-full border-4 border-white/[0.04]"
        style={{ width: 600, height: 600, bottom: -200, left: -150 }}
      />
      <div
        className="pointer-events-none absolute rounded-full border-4 border-white/[0.04]"
        style={{ width: 900, height: 900, bottom: -350, left: -300 }}
      />

      <div
        className={`relative z-10 bg-white ${shake ? "cr-shake" : ""}`}
        style={{
          width: 440,
          maxWidth: "100%",
          borderRadius: 16,
          padding: 40,
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        }}
      >
        <div className="flex flex-col items-center">
          <CedarLogo />
          <div className="mt-3 text-[13px] text-[var(--color-cr-secondary)]">Intelligence Platform</div>
        </div>

        <div className="mt-8 text-center">
          <h1 className="text-[24px] font-bold text-[var(--color-cr-heading)] leading-tight">{title}</h1>
          <p className="mt-1.5 text-[14px] text-[var(--color-cr-secondary)]">{subtitle}</p>
        </div>

        {children}

        <div className="mt-8 text-center text-[11px] text-[var(--color-cr-muted)]">
          © 2026 Cedar Rose International · Confidential
        </div>
      </div>
    </div>
  );
}

export const authInputClassName =
  "w-full h-11 rounded-lg border border-[var(--color-cr-input-border)] px-3.5 text-[14px] text-[var(--color-cr-body)] outline-none transition focus:border-[var(--color-cr-indigo)] focus:shadow-[0_0_0_3px_rgba(79,70,229,0.15)]";

export const authLabelClassName = "block text-[12px] font-medium text-[var(--color-cr-label)] mb-1.5";

export const authButtonClassName =
  "w-full h-[46px] rounded-lg bg-[var(--color-cr-indigo)] text-white text-[15px] font-medium transition hover:bg-[var(--color-cr-indigo-hover)] active:scale-[0.98] disabled:opacity-90 disabled:cursor-not-allowed flex items-center justify-center";
