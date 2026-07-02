import { Link, useNavigate } from "react-router-dom";
import { useState, type SubmitEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/services/api/client";
import { completeLogin } from "@/lib/auth-session";
import {
  AuthPageShell,
  PasswordField,
  authButtonClassName,
  authInputClassName,
  authLabelClassName,
  authLinkClassName,
} from "@/features/auth/components/AuthPageShell";

export default function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await completeLogin(queryClient, email, password);
      navigate("/select-app", { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Unable to sign in. Check your credentials and try again.";
      setError(message);
      setShake(true);
      setTimeout(() => setShake(false), 350);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell shake={shake} title="Welcome back" subtitle="Sign in to your account">
      <form onSubmit={handleSubmit} className="mt-7">
        <div>
          <label htmlFor="login-email" className={authLabelClassName}>
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@cedarrose.com"
            className={authInputClassName}
            required
          />
        </div>

        <PasswordField
          id="login-password"
          label="Password"
          value={password}
          onChange={setPassword}
          placeholder="Enter your password"
          className="mt-4"
          autoComplete="current-password"
        />
        {error && <p className="mt-2 text-[12px] text-[var(--color-cr-error)]">{error}</p>}

        <div className="mt-2 flex justify-end">
          <Link to="/forgot-password" className={`text-[12px] ${authLinkClassName}`}>
            Forgot password?
          </Link>
        </div>

        <button type="submit" disabled={loading} className={`mt-6 ${authButtonClassName}`}>
          {loading ? <span className="cr-spinner" /> : "Sign in"}
        </button>
      </form>
    </AuthPageShell>
  );
}
