import { useState, type SubmitEvent } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { authService } from "@/services";
import { ApiError } from "@/services/api/client";
import {
  AuthPageShell,
  authButtonClassName,
  authInputClassName,
  authLabelClassName,
  authLinkClassName,
} from "@/features/auth/components/AuthPageShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to send reset email. Please try again.",
      );
      setShake(true);
      setTimeout(() => setShake(false), 350);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthPageShell
        title="Check your email"
        subtitle="If an account exists for that address, we sent password reset instructions."
      >
        <div className="mt-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="text-[14px] text-[var(--color-cr-secondary)]">
            We sent a link to <span className="font-medium text-[var(--color-cr-body)]">{email}</span>.
            The link expires in 1 hour.
          </p>
          <p className="text-[12px] text-[var(--color-cr-muted)]">
            Didn&apos;t receive it? Check spam or try again with the correct email.
          </p>
          <Link to="/login" className={`${authButtonClassName} no-underline`}>
            Back to sign in
          </Link>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      shake={shake}
      title="Forgot password?"
      subtitle="Enter your email and we'll send you a reset link."
    >
      <form onSubmit={handleSubmit} className="mt-7">
        <div>
          <label htmlFor="forgot-email" className={authLabelClassName}>
            Email address
          </label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@cedarrose.com"
            className={authInputClassName}
            required
            autoComplete="email"
            autoFocus
          />
          {error && <p className="mt-2 text-[12px] text-[var(--color-cr-error)]">{error}</p>}
        </div>

        <button type="submit" disabled={loading} className={`mt-6 ${authButtonClassName}`}>
          {loading ? <span className="cr-spinner" /> : "Send reset link"}
        </button>
      </form>

      <p className="mt-4 text-center text-[12px] text-[var(--color-cr-secondary)]">
        Remember your password?{" "}
        <Link to="/login" className={authLinkClassName}>
          Back to sign in
        </Link>
      </p>
    </AuthPageShell>
  );
}
