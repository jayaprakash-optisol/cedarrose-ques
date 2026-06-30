import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/app/auth-provider";

const authState = vi.hoisted(() => ({
  user: {
    id: "u-1",
    name: "Admin User",
    email: "admin@cedarrose.local",
    role: "admin" as const,
    initials: "AU",
  },
  isAdmin: true,
  isLoading: false,
  isAuthenticated: true,
  isBootstrapping: false,
}));

const appSelection = vi.hoisted(() => ({
  hasAppSelected: vi.fn(() => true),
}));

vi.mock("@/config/env", () => ({
  env: { useMock: false, apiBaseUrl: "/api/v1", qaAutomationUrl: "" },
}));

vi.mock("@/app/auth-context", () => ({
  useAuth: () => authState,
  AuthContext: { Provider: ({ children }: { children: React.ReactNode }) => children },
}));

vi.mock("@/lib/app-selection", () => ({
  hasAppSelected: appSelection.hasAppSelected,
}));

vi.mock("@/components/layout/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/lib/auth-session", () => ({
  CURRENT_USER_QUERY_KEY: ["current-user"],
  fetchCurrentUser: vi.fn().mockResolvedValue(authState.user),
}));

vi.mock("@/features/dashboard/pages/DashboardPage", () => ({
  default: () => <h1>Dashboard</h1>,
}));
vi.mock("@/features/auth/pages/LoginPage", () => ({
  default: () => <div>Login Page</div>,
}));
vi.mock("@/features/auth/pages/SelectAppPage", () => ({
  default: () => <div>Select App Page</div>,
}));

describe("AppRouter guards (non-mock)", () => {
  beforeEach(() => {
    authState.isAuthenticated = true;
    authState.isLoading = false;
    authState.isBootstrapping = false;
    authState.user = {
      id: "u-1",
      name: "Admin User",
      email: "admin@cedarrose.local",
      role: "admin" as const,
      initials: "AU",
    };
    appSelection.hasAppSelected.mockReturnValue(true);
    vi.resetModules();
  });

  it("redirects unauthenticated users to login", async () => {
    authState.isAuthenticated = false;
    authState.user = null as unknown as typeof authState.user;
    await renderRouterAt("/");
    expect(await screen.findByText(/login page/i)).toBeInTheDocument();
  });

  it("shows loader while bootstrapping", async () => {
    authState.isBootstrapping = true;
    await renderRouterAt("/");
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("redirects to select-app when no app selected", async () => {
    appSelection.hasAppSelected.mockReturnValue(false);
    await renderRouterAt("/");
    expect(await screen.findByText(/select app page/i)).toBeInTheDocument();
  });
});

async function renderRouterAt(path: string) {
  window.history.pushState({}, "", path);
  const { AppRouter } = await import("@/app/router");
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { render } = await import("@testing-library/react");
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </QueryClientProvider>,
  );
}
