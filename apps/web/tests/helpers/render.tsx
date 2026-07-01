import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthContext, type AuthContextValue } from "@/app/auth-context";
import type { CurrentUser } from "@/types";
import type { ReactElement, ReactNode } from "react";

interface ProviderOptions {
  /** Override the default unauthenticated auth context. */
  authValue?: Partial<AuthContextValue>;
  /** Path the MemoryRouter should start at. Defaults to "/". */
  routerPath?: string;
  /** Use an existing QueryClient (so cache state can be pre-loaded). */
  queryClient?: QueryClient;
}

const defaultAuth: AuthContextValue = {
  user: undefined,
  isAdmin: false,
  isLoading: false,
  isAuthenticated: false,
  isBootstrapping: false,
};

export function makeTestUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: "u1",
    name: "Jane Doe",
    email: "jane@example.com",
    role: "analyst",
    title: "Analyst",
    initials: "JD",
    ...overrides,
  };
}

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

export function renderWithProviders(
  ui: ReactElement,
  options: ProviderOptions = {},
): RenderResult & { queryClient: QueryClient } {
  const { authValue, routerPath = "/", queryClient = makeQueryClient() } = options;
  const auth: AuthContextValue = { ...defaultAuth, ...authValue };

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={auth}>
          <TooltipProvider delayDuration={0}>
            <MemoryRouter initialEntries={[routerPath]}>{children}</MemoryRouter>
          </TooltipProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  }

  const result = render(ui, { wrapper: Wrapper, ...options as RenderOptions });
  return Object.assign(result, { queryClient });
}
