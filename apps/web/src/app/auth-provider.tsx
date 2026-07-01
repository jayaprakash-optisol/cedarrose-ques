import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CurrentUser } from "@/types";
import { CURRENT_USER_QUERY_KEY, fetchCurrentUser } from "@/lib/auth-session";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const { data, isPending, isFetching, isFetched } = useQuery<CurrentUser | null>({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const user = data ?? undefined;
  const isBootstrapping = !isFetched && (isPending || isFetching);
  const isLoading = isBootstrapping || ((isPending || isFetching) && !isFetched);

  const value = useMemo(
    () => ({
      user,
      isAdmin: user?.role === "admin",
      isLoading,
      isAuthenticated: !!user,
      isBootstrapping,
    }),
    [user, isLoading, isBootstrapping],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
