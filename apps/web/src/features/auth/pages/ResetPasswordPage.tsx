import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { authService } from "@/services";
import { ApiError } from "@/services/api/client";
import {
  AuthPageShell,
  AuthStatusPanel,
  PasswordField,
  PasswordConfirmSubmit,
  authButtonClassName,
  authLinkClassName,
} from "@/features/auth/components/AuthPageShell";
import { usePasswordConfirmationForm } from "@/features/auth/hooks/usePasswordConfirmationForm";

type PageState = "loading" | "invalid" | "form" | "success";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [pageState, setPageState] = useState<PageState>("loading");
  const [invalidMessage, setInvalidMessage] = useState(
    "This password reset link is invalid or has expired.",
  );

  const {
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    submitting,
    error,
    shake,
    handleSubmit,
  } = usePasswordConfirmationForm({
    onSubmit: async (pwd) => {
      await authService.resetPassword(token, pwd);
      setPageState("success");
    },
    fallbackErrorMessage: "Unable to reset password. The link may have expired.",
    isApiError: (err) => err instanceof ApiError,
    getErrorMessage: (err) => (err as ApiError).message,
  });

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
        <AuthStatusPanel
          iconWrapperClassName="bg-red-50"
          icon={<AlertCircle className="h-6 w-6 text-[var(--color-cr-error)]" />}
          message="Request a new link if you still need to reset your password."
        >
          <Link to="/forgot-password" className={`${authButtonClassName} no-underline`}>
            Request reset link
          </Link>
        </AuthStatusPanel>
      </AuthPageShell>
    );
  }

  if (pageState === "success") {
    return (
      <AuthPageShell title="Password updated" subtitle="Your password has been reset successfully.">
        <AuthStatusPanel
          iconWrapperClassName="bg-emerald-50"
          icon={<CheckCircle2 className="h-6 w-6 text-emerald-600" />}
          message="You can now sign in with your new password."
        >
          <button
            type="button"
            className={authButtonClassName}
            onClick={() => navigate("/login", { replace: true })}
          >
            Continue to sign in
          </button>
        </AuthStatusPanel>
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
        <PasswordField
          id="reset-password"
          label="New password"
          value={password}
          onChange={setPassword}
          placeholder="At least 8 characters"
          autoFocus
          minLength={8}
        />

        <PasswordConfirmSubmit
          confirmId="reset-confirm"
          confirmValue={confirmPassword}
          onConfirmChange={setConfirmPassword}
          error={error}
          submitting={submitting}
          submitLabel="Reset password"
        />
      </form>

      <p className="mt-4 text-center text-[12px] text-[var(--color-cr-secondary)]">
        <Link to="/login" className={authLinkClassName}>
          Back to sign in
        </Link>
      </p>
    </AuthPageShell>
  );
}
