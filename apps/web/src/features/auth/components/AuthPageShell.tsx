import { useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { CedarLogo } from "@/components/CedarLogo";

interface AuthPageShellProps {
  readonly children: ReactNode;
  readonly title: string;
  readonly subtitle: string;
  readonly shake?: boolean;
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

export const authLinkClassName =
  "text-[var(--color-cr-indigo)] no-underline hover:underline";

interface PasswordFieldProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly autoFocus?: boolean;
  readonly className?: string;
  readonly minLength?: number;
  readonly autoComplete?: string;
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoFocus = false,
  className = "",
  minLength,
  autoComplete = "new-password",
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={className}>
      <label htmlFor={id} className={authLabelClassName}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${authInputClassName} pr-10`}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-cr-secondary)] hover:text-[var(--color-cr-body)]"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

interface PasswordConfirmSubmitProps {
  readonly confirmId: string;
  readonly confirmValue: string;
  readonly onConfirmChange: (value: string) => void;
  readonly error: string;
  readonly submitting: boolean;
  readonly submitLabel: string;
}

export function PasswordConfirmSubmit({
  confirmId,
  confirmValue,
  onConfirmChange,
  error,
  submitting,
  submitLabel,
}: PasswordConfirmSubmitProps) {
  return (
    <>
      <PasswordField
        id={confirmId}
        label="Confirm password"
        value={confirmValue}
        onChange={onConfirmChange}
        placeholder="Re-enter your password"
        className="mt-4"
        minLength={8}
      />
      {error && <p className="mt-2 text-[12px] text-[var(--color-cr-error)]">{error}</p>}

      <button type="submit" disabled={submitting} className={`mt-6 ${authButtonClassName}`}>
        {submitting ? <span className="cr-spinner" /> : submitLabel}
      </button>
    </>
  );
}

interface AuthStatusPanelProps {
  readonly iconWrapperClassName: string;
  readonly icon: ReactNode;
  readonly message: ReactNode;
  readonly children: ReactNode;
}

export function AuthStatusPanel({ iconWrapperClassName, icon, message, children }: AuthStatusPanelProps) {
  return (
    <div className="mt-8 text-center space-y-4">
      <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${iconWrapperClassName}`}>
        {icon}
      </div>
      <p className="text-[14px] text-[var(--color-cr-secondary)]">{message}</p>
      {children}
    </div>
  );
}

