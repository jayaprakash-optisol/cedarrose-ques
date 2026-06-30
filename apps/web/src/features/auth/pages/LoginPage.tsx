import { Link, useNavigate } from "react-router-dom";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { authService } from "@/services";
import { ApiError } from "@/services/api/client";
import { env } from "@/config/env";
import { completeLogin } from "@/lib/auth-session";
import {
  AuthPageShell,
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
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  async function handleSubmit(e: FormEvent) {
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
          : env.useMock
            ? "Invalid email or password. Please try again."
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
          <label className={authLabelClassName}>Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@cedarrose.com"
            className={authInputClassName}
            required
          />
        </div>

        <div className="mt-4">
          <label className={authLabelClassName}>Password</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className={`${authInputClassName} pr-10`}
              required
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-cr-secondary)] hover:text-[var(--color-cr-body)]"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {error && <p className="mt-2 text-[12px] text-[var(--color-cr-error)]">{error}</p>}
        </div>

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
