import type { QueryClient } from "@tanstack/react-query";
import type { CurrentUser } from "@/types";
import { authService } from "@/services";
import { env } from "@/config/env";
import { clearAppSelected } from "@/lib/app-selection";
import { ApiError } from "@/services/api/client";

export const CURRENT_USER_QUERY_KEY = ["current-user"] as const;

const LEGACY_TOKEN_KEY = "cedarrose_access_token";

export function clearLegacyTokenStorage() {
  try {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch {
    // ignore
  }
}

/** Returns null when unauthenticated or session cannot be read, rethrows other errors. */
export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  try {
    return await authService.getCurrentUser();
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 401 ||
        error.status === 304 ||
        error.code === "INVALID_JSON" ||
        error.code === "EMPTY_RESPONSE")
    ) {
      return null;
    }
    throw error;
  }
}

export async function refreshCurrentUser(queryClient: QueryClient) {
  return queryClient.fetchQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: fetchCurrentUser,
    staleTime: 0,
  });
}

export async function completeLogin(queryClient: QueryClient, email: string, password: string) {
  const user = await authService.login(email.trim(), password, false);
  clearLegacyTokenStorage();

  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== CURRENT_USER_QUERY_KEY[0],
  });
  queryClient.setQueryData(CURRENT_USER_QUERY_KEY, user);

  const verified = await fetchCurrentUser();
  if (verified) {
    queryClient.setQueryData(CURRENT_USER_QUERY_KEY, verified);
  }
}

export async function completeLogout(queryClient: QueryClient) {
  clearAppSelected();
  clearLegacyTokenStorage();
  if (!env.useMock) {
    await authService.logout();
  }
  queryClient.setQueryData(CURRENT_USER_QUERY_KEY, null);
  queryClient.removeQueries();
}
