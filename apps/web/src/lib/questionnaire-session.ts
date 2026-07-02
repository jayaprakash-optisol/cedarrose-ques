import { ApiError } from "@/services/api/errors";
import type { QSessionState } from "@/types/questionnaire";

export const questionnaireSessionKey = (token: string) => `q_session_${token}`;

export function isSessionExpiredError(err: unknown): boolean {
  return err instanceof ApiError && err.code === "SESSION_EXPIRED";
}

/**
 * Read and parse the stored questionnaire session for a token.
 * Returns null (and lets the caller redirect) when the session is missing or corrupt.
 */
export function readQuestionnaireSession(token: string): QSessionState | null {
  const stored = sessionStorage.getItem(questionnaireSessionKey(token));
  if (!stored) return null;
  try {
    return JSON.parse(stored) as QSessionState;
  } catch {
    return null;
  }
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
