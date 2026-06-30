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

vi.mock("@/app/auth-context", () => ({
  useAuth: () => authState,
  AuthContext: { Provider: ({ children }: { children: React.ReactNode }) => children },
}));

vi.mock("@/lib/app-selection", () => ({
  hasAppSelected: () => true,
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
vi.mock("@/features/cases/pages/CasesPage", () => ({
  default: () => <h1>All Cases</h1>,
}));
vi.mock("@/features/settings/pages/SettingsPage", () => ({
  default: () => <h1>Settings</h1>,
}));
vi.mock("@/features/admin/users/pages/UsersPage", () => ({
  default: () => <h1>User Management</h1>,
}));
vi.mock("@/features/auth/pages/LoginPage", () => ({
  default: () => <div>Login</div>,
}));
vi.mock("@/features/auth/pages/SelectAppPage", () => ({
  default: () => <div>Select App</div>,
}));
vi.mock("@/features/audit-log/pages/AuditLogPage", () => ({
  default: () => <h1>Audit Log</h1>,
}));
vi.mock("@/features/new-request/pages/NewRequestPage", () => ({
  default: () => <h1>New Request</h1>,
}));
vi.mock("@/features/admin/form-builder/pages/FormBuilderPage", () => ({
  default: () => <div>Form Builder</div>,
}));
vi.mock("@/features/admin/configuration/pages/ConfigurationPage", () => ({
  default: () => <div>Configuration</div>,
}));

describe("AppRouter", () => {
  beforeEach(() => {
    authState.isAdmin = true;
    authState.isAuthenticated = true;
    authState.isLoading = false;
    vi.resetModules();
  });

  it("renders dashboard at root", async () => {
    await renderRouterAt("/");
    expect(await screen.findByRole("heading", { name: /dashboard/i })).toBeInTheDocument();
  });

  it("renders cases page", async () => {
    await renderRouterAt("/cases");
    expect(await screen.findByRole("heading", { name: /all cases/i })).toBeInTheDocument();
  });

  it("renders settings page", async () => {
    await renderRouterAt("/settings");
    expect(await screen.findByRole("heading", { name: /settings/i })).toBeInTheDocument();
  });

  it("renders admin users page", async () => {
    await renderRouterAt("/admin/users");
    expect(await screen.findByRole("heading", { name: /user management/i })).toBeInTheDocument();
  });

  it("renders 404 for unknown routes", async () => {
    await renderRouterAt("/does-not-exist");
    expect(await screen.findByRole("heading", { name: "404" })).toBeInTheDocument();
  });

  it("redirects non-admin away from admin routes", async () => {
    authState.isAdmin = false;
    await renderRouterAt("/admin/users");
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: /user management/i })).not.toBeInTheDocument();
    });
  });

  it("renders admin configuration route", async () => {
    await renderRouterAt("/admin/configuration");
    expect(await screen.findByText(/configuration/i)).toBeInTheDocument();
  });

  it("renders admin form builder route", async () => {
    await renderRouterAt("/admin/form-builder");
    expect(await screen.findByText(/form builder/i)).toBeInTheDocument();
  });

  it("renders audit log route", async () => {
    await renderRouterAt("/audit-log");
    expect(await screen.findByRole("heading", { name: /audit log/i })).toBeInTheDocument();
  });

  it("renders new request route", async () => {
    await renderRouterAt("/new-request");
    expect(await screen.findByRole("heading", { name: /new request/i })).toBeInTheDocument();
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
