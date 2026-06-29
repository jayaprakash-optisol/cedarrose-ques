import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CurrentUser } from "@/types";
import { env } from "@/config/env";
import { CURRENT_USER_QUERY_KEY, fetchCurrentUser } from "@/lib/auth-session";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isPending, isFetching, isFetched } = useQuery<CurrentUser | null>({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const user = data ?? undefined;
  const isBootstrapping = !env.useMock && !isFetched && (isPending || isFetching);
  const isLoading = isBootstrapping || ((isPending || isFetching) && !isFetched);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: user?.role === "admin",
        isLoading,
        isAuthenticated: !!user,
        isBootstrapping,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
