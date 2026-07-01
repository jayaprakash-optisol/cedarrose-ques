import { ApiError } from "@/services/api/errors";

export const questionnaireSessionKey = (token: string) => `q_session_${token}`;

export function isSessionExpiredError(err: unknown): boolean {
  return err instanceof ApiError && err.code === "SESSION_EXPIRED";
}

/** Remove the JWT from session storage so the user can re-authenticate via OTP. */
export function clearQuestionnaireSessionToken(linkToken: string) {
  const key = questionnaireSessionKey(linkToken);
  const stored = sessionStorage.getItem(key);
  if (!stored) return;
  try {
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    delete parsed.sessionToken;
    sessionStorage.setItem(key, JSON.stringify(parsed));
  } catch {
    sessionStorage.removeItem(key);
  }
}
