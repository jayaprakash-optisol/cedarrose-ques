import { createContext, useContext } from "react";
import type { CurrentUser } from "@/types";

export interface AuthContextValue {
  user: CurrentUser | undefined;
  isAdmin: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
}

export const AuthContext = createContext<AuthContextValue>({
  user: undefined,
  isAdmin: false,
  isLoading: true,
  isAuthenticated: false,
  isBootstrapping: true,
});

export function useAuth() {
  return useContext(AuthContext);
}
