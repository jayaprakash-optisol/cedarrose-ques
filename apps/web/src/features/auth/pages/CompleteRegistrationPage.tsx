import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { authService } from "@/services";
import { ApiError } from "@/services/api/client";
import type { InvitationInfo } from "@/types";
import {
  AuthPageShell,
  authButtonClassName,
  authInputClassName,
  authLabelClassName,
} from "@/features/auth/components/AuthPageShell";

type PageState = "loading" | "invalid" | "form" | "success";

export default function CompleteRegistrationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [pageState, setPageState] = useState<PageState>("loading");
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [invalidMessage, setInvalidMessage] = useState("This invitation link is invalid or has expired.");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!token) {
      setInvalidMessage("No invitation token was provided.");
      setPageState("invalid");
      return;
    }

    let cancelled = false;
    authService
      .verifyInvitation(token)
      .then((info) => {
        if (cancelled) return;
        setInvitation(info);
        setPageState("form");
      })
      .catch((err) => {
        if (cancelled) return;
        setInvalidMessage(
          err instanceof ApiError ? err.message : "This invitation link is invalid or has expired.",
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
      await authService.completeRegistration(token, password);
      setPageState("success");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to complete registration. Please try again.",
      );
      setShake(true);
      setTimeout(() => setShake(false), 350);
    } finally {
      setSubmitting(false);
    }
  }

  if (pageState === "loading") {
    return (
      <AuthPageShell title="Complete registration" subtitle="Verifying your invitation…">
        <div className="mt-10 flex justify-center">
          <span
            className="inline-block h-5 w-5 rounded-full border-2 animate-spin"
            style={{ borderColor: "rgba(79,70,229,0.25)", borderTopColor: "var(--color-cr-indigo)" }}
          />
        </div>
      </AuthPageShell>
    );
  }

  if (pageState === "invalid") {
    return (
      <AuthPageShell title="Invitation unavailable" subtitle="We couldn't verify this link.">
        <div className="mt-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-6 w-6 text-[var(--color-cr-error)]" />
          </div>
          <p className="text-[14px] text-[var(--color-cr-secondary)]">{invalidMessage}</p>
          <Link
            to="/login"
            className={`${authButtonClassName} no-underline`}
          >
            Back to sign in
          </Link>
        </div>
      </AuthPageShell>
    );
  }

  if (pageState === "success") {
    return (
      <AuthPageShell title="Account activated" subtitle="Your registration is complete.">
        <div className="mt-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="text-[14px] text-[var(--color-cr-secondary)]">
            You can now sign in with your email and the password you just created.
          </p>
          <button type="button" className={authButtonClassName} onClick={() => navigate("/login", { replace: true })}>
            Continue to sign in
          </button>
        </div>
      </AuthPageShell>
    );
  }

  const fullName = invitation ? `${invitation.firstName} ${invitation.lastName}`.trim() : "";

  return (
    <AuthPageShell
      shake={shake}
      title={`Welcome, ${invitation?.firstName ?? "there"}`}
      subtitle="Set your password to activate your Cedar Rose account."
    >
      <div className="mt-6 rounded-lg border border-[var(--color-cr-border)] bg-[var(--color-cr-bg)] px-4 py-3 text-[13px]">
        <div className="flex justify-between gap-3">
          <span className="text-[var(--color-cr-secondary)]">Name</span>
          <span className="font-medium text-[var(--color-cr-body)] text-right">{fullName}</span>
        </div>
        <div className="mt-2 flex justify-between gap-3">
          <span className="text-[var(--color-cr-secondary)]">Email</span>
          <span className="font-medium text-[var(--color-cr-body)] text-right break-all">{invitation?.email}</span>
        </div>
        <div className="mt-2 flex justify-between gap-3">
          <span className="text-[var(--color-cr-secondary)]">Role</span>
          <span className="font-medium text-[var(--color-cr-body)] text-right">{invitation?.role}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6">
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
          {submitting ? <span className="cr-spinner" /> : "Activate account"}
        </button>
      </form>

      <p className="mt-4 text-center text-[12px] text-[var(--color-cr-secondary)]">
        Already have an account?{" "}
        <Link to="/login" className="text-[var(--color-cr-indigo)] no-underline hover:underline">
          Sign in
        </Link>
      </p>
    </AuthPageShell>
  );
}
