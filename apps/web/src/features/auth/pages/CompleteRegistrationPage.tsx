import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { authService } from "@/services";
import { ApiError } from "@/services/api/client";
import type { InvitationInfo } from "@/types";
import {
  AuthPageShell,
  AuthStatusPanel,
  PasswordField,
  PasswordConfirmSubmit,
  authButtonClassName,
} from "@/features/auth/components/AuthPageShell";
import { usePasswordConfirmationForm } from "@/features/auth/hooks/usePasswordConfirmationForm";

type PageState = "loading" | "invalid" | "form" | "success";

export default function CompleteRegistrationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [pageState, setPageState] = useState<PageState>("loading");
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [invalidMessage, setInvalidMessage] = useState("This invitation link is invalid or has expired.");

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
      await authService.completeRegistration(token, pwd);
      setPageState("success");
    },
    fallbackErrorMessage: "Unable to complete registration. Please try again.",
    isApiError: (err) => err instanceof ApiError,
    getErrorMessage: (err) => (err as ApiError).message,
  });

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
        <AuthStatusPanel
          iconWrapperClassName="bg-red-50"
          icon={<AlertCircle className="h-6 w-6 text-[var(--color-cr-error)]" />}
          message={invalidMessage}
        >
          <Link to="/login" className={`${authButtonClassName} no-underline`}>
            Back to sign in
          </Link>
        </AuthStatusPanel>
      </AuthPageShell>
    );
  }

  if (pageState === "success") {
    return (
      <AuthPageShell title="Account activated" subtitle="Your registration is complete.">
        <AuthStatusPanel
          iconWrapperClassName="bg-emerald-50"
          icon={<CheckCircle2 className="h-6 w-6 text-emerald-600" />}
          message="You can now sign in with your email and the password you just created."
        >
          <button type="button" className={authButtonClassName} onClick={() => navigate("/login", { replace: true })}>
            Continue to sign in
          </button>
        </AuthStatusPanel>
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
        <PasswordField
          id="reg-password"
          label="New password"
          value={password}
          onChange={setPassword}
          placeholder="At least 8 characters"
          minLength={8}
        />

        <PasswordConfirmSubmit
          confirmId="reg-confirm"
          confirmValue={confirmPassword}
          onConfirmChange={setConfirmPassword}
          error={error}
          submitting={submitting}
          submitLabel="Activate account"
        />
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
