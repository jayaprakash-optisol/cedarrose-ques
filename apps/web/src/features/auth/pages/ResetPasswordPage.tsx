import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { authService } from "@/services";
import { ApiError } from "@/services/api/client";
import {
  AuthPageShell,
  authButtonClassName,
  authInputClassName,
  authLabelClassName,
  authLinkClassName,
} from "@/features/auth/components/AuthPageShell";

type PageState = "loading" | "invalid" | "form" | "success";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [pageState, setPageState] = useState<PageState>("loading");
  const [invalidMessage, setInvalidMessage] = useState(
    "This password reset link is invalid or has expired.",
  );

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!token) {
      setInvalidMessage("This password reset link is missing or incomplete.");
      setPageState("invalid");
      return;
    }

    let cancelled = false;
    authService
      .verifyResetToken(token)
      .then(() => {
        if (cancelled) return;
        setPageState("form");
      })
      .catch((err) => {
        if (cancelled) return;
        setInvalidMessage(
          err instanceof ApiError
            ? err.message
            : "This password reset link is invalid or has expired.",
        );
        setPageState("invalid");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setShake(true);
      setTimeout(() => setShake(false), 350);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setShake(true);
      setTimeout(() => setShake(false), 350);
      return;
    }

    setSubmitting(true);
    try {
      await authService.resetPassword(token, password);
      setPageState("success");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to reset password. The link may have expired.",
      );
      setShake(true);
      setTimeout(() => setShake(false), 350);
    } finally {
      setSubmitting(false);
    }
  }

  if (pageState === "loading") {
    return (
      <AuthPageShell title="Checking reset link" subtitle="Please wait while we verify your link.">
        <div className="mt-8 flex justify-center">
          <span className="cr-spinner" />
        </div>
      </AuthPageShell>
    );
  }

  if (pageState === "invalid") {
    return (
      <AuthPageShell title="Reset link invalid" subtitle={invalidMessage}>
        <div className="mt-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-6 w-6 text-[var(--color-cr-error)]" />
          </div>
          <p className="text-[14px] text-[var(--color-cr-secondary)]">
            Request a new link if you still need to reset your password.
          </p>
          <Link to="/forgot-password" className={`${authButtonClassName} no-underline`}>
            Request reset link
          </Link>
        </div>
      </AuthPageShell>
    );
  }

  if (pageState === "success") {
    return (
      <AuthPageShell title="Password updated" subtitle="Your password has been reset successfully.">
        <div className="mt-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="text-[14px] text-[var(--color-cr-secondary)]">
            You can now sign in with your new password.
          </p>
          <button
            type="button"
            className={authButtonClassName}
            onClick={() => navigate("/login", { replace: true })}
          >
            Continue to sign in
          </button>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      shake={shake}
      title="Set a new password"
      subtitle="Choose a strong password for your Cedar Rose account."
    >
      <form onSubmit={handleSubmit} className="mt-7">
        <div>
          <label className={authLabelClassName}>New password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className={`${authInputClassName} pr-10`}
              required
              minLength={8}
              autoComplete="new-password"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-cr-secondary)] hover:text-[var(--color-cr-body)]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="mt-4">
          <label className={authLabelClassName}>Confirm password</label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              className={`${authInputClassName} pr-10`}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-cr-secondary)] hover:text-[var(--color-cr-body)]"
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {error && <p className="mt-2 text-[12px] text-[var(--color-cr-error)]">{error}</p>}
        </div>

        <button type="submit" disabled={submitting} className={`mt-6 ${authButtonClassName}`}>
          {submitting ? <span className="cr-spinner" /> : "Reset password"}
        </button>
      </form>

      <p className="mt-4 text-center text-[12px] text-[var(--color-cr-secondary)]">
        <Link to="/login" className={authLinkClassName}>
          Back to sign in
        </Link>
      </p>
    </AuthPageShell>
  );
}
