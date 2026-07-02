import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  casesService,
  dashboardService,
  usersService,
  settingsService,
  templatesService,
} from "@/services";
import type { AuthContextValue } from "@/app/auth-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { CompletionStats } from "@/types/dashboard";
import { makeTestUser, makeQueryClient } from "../helpers/render";
import { setAppSelected } from "@/lib/app-selection";

const emptyCompletionStats: CompletionStats = {
  period: "7d",
  caseCount: 0,
  expiredCapDays: 7,
  includesInProgress: false,
  summary: {
    avgTimeToFirstOpen: { value: null, unit: "hours", trend: null, trendUnit: "hours" },
    avgTimeToComplete: { value: null, unit: "hours", trend: null, trendUnit: "hours" },
    avgTotalTurnaround: { value: null, unit: "days", trend: null, trendUnit: "days" },
  },
  overallAvgDays: 0,
  byCompany: [],
};

// DashboardPage renders recharts' <ResponsiveContainer>, which relies on
// ResizeObserver — not implemented in jsdom. The AdminGuard redirect test
// below lands a non-admin user on "/" (DashboardPage), so a minimal stub is
// needed purely to let that page mount without throwing.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

const defaultAuth: AuthContextValue = {
  user: undefined,
  isAdmin: false,
  isLoading: false,
  isAuthenticated: false,
  isBootstrapping: false,
};

/**
 * `AppRouter` calls `createBrowserRouter` internally, so it drives its own
 * history off `window.location` rather than the `MemoryRouter` that
 * `renderWithProviders` sets up (nesting the two throws "cannot render a
 * Router inside another Router"). To control the starting path per test we
 * push a real history entry, then reset the module cache and re-import the
 * router so `createBrowserRouter` re-evaluates against the new location.
 */
async function renderRouterAt(path: string, authValue: Partial<AuthContextValue> = {}) {
  vi.resetModules();
  window.history.pushState({}, "", path);
  // Re-import from the reset registry so the `AuthContext` instance used by
  // the freshly-loaded router is the *same* instance we provide a value for
  // below — a statically-imported `AuthContext` would be a stale module
  // instance after `vi.resetModules()`, so the guard would silently read
  // the context's default value (isBootstrapping: true) forever.
  const { AppRouter } = await import("@/app/router");
  const { AuthContext } = await import("@/app/auth-context");
  const auth: AuthContextValue = { ...defaultAuth, ...authValue };
  const queryClient = makeQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <TooltipProvider delayDuration={0}>
          <AppRouter />
        </TooltipProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe("AppRouter", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("redirects an unauthenticated user hitting a protected route to /login", async () => {
    await renderRouterAt("/cases", { isAuthenticated: false, user: undefined });
    expect(await screen.findByText("Welcome back")).toBeInTheDocument();
  });

  it("shows the loading state while the auth context is bootstrapping", async () => {
    await renderRouterAt("/cases", { isBootstrapping: true });
    expect(await screen.findByText("Loading…")).toBeInTheDocument();
  });

  it("shows the loading state while the auth context is loading", async () => {
    await renderRouterAt("/cases", { isLoading: true });
    expect(await screen.findByText("Loading…")).toBeInTheDocument();
  });

  it("redirects an authenticated user with no app selected to /select-app", async () => {
    const user = makeTestUser();
    await renderRouterAt("/cases", { isAuthenticated: true, user });
    expect(await screen.findByText(/Select one to continue/)).toBeInTheDocument();
  });

  it("redirects a non-admin user hitting an /admin route away from the admin page", async () => {
    vi.spyOn(casesService, "list").mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0 },
    });
    vi.spyOn(dashboardService, "getCompletionStats").mockResolvedValue(emptyCompletionStats);
    setAppSelected("questionnaire");
    const user = makeTestUser({ role: "analyst" });
    await renderRouterAt("/admin/users", { isAuthenticated: true, user, isAdmin: false });
    expect(await screen.findByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(screen.queryByText("User Management")).not.toBeInTheDocument();
  });

  it("AdminGuard shows the loading state when isLoading is true even past AuthGuard", async () => {
    const user = makeTestUser({ role: "admin" });
    setAppSelected("questionnaire");
    await renderRouterAt("/admin/users", { isAuthenticated: true, user, isAdmin: true, isLoading: true });
    expect(await screen.findByText("Loading…")).toBeInTheDocument();
  });

  it("renders the admin page when an admin user hits an /admin route", async () => {
    vi.spyOn(usersService, "list").mockResolvedValue([]);
    setAppSelected("questionnaire");
    const user = makeTestUser({ role: "admin" });
    await renderRouterAt("/admin/users", { isAuthenticated: true, user, isAdmin: true });
    expect(await screen.findByText("User Management")).toBeInTheDocument();
  });

  it("renders the 404 fallback for an unmatched path", async () => {
    await renderRouterAt("/this-route-does-not-exist");
    expect(await screen.findByText("404")).toBeInTheDocument();
    expect(screen.getByText("Page not found")).toBeInTheDocument();
  });

  it("renders the dashboard page at /", async () => {
    vi.spyOn(casesService, "list").mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0 },
    });
    vi.spyOn(dashboardService, "getCompletionStats").mockResolvedValue(emptyCompletionStats);
    setAppSelected("questionnaire");
    const user = makeTestUser({ role: "analyst" });
    await renderRouterAt("/", { isAuthenticated: true, user });
    expect(await screen.findByRole("heading", { name: "Overview" })).toBeInTheDocument();
  });

  it("renders the new request page at /new-request", async () => {
    vi.spyOn(templatesService, "list").mockResolvedValue([]);
    setAppSelected("questionnaire");
    const user = makeTestUser({ role: "analyst" });
    await renderRouterAt("/new-request", { isAuthenticated: true, user });
    expect(
      await screen.findByRole("heading", { name: "New questionnaire request" }),
    ).toBeInTheDocument();
  });

  it("renders the settings page at /settings", async () => {
    vi.spyOn(settingsService, "get").mockResolvedValue({
      user: {
        id: "u1",
        name: "Jane Doe",
        email: "jane@example.com",
        role: "analyst",
        title: "Analyst",
        initials: "JD",
      },
      preferences: {
        notifyOnSubmission: true,
        notifyOnLinkExpiry: true,
        notifyOnBlockedDispatch: true,
        notifyOnRemindersSent: true,
      },
    });
    setAppSelected("questionnaire");
    const user = makeTestUser({ role: "analyst" });
    await renderRouterAt("/settings", { isAuthenticated: true, user });
    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
  });

  it("renders the form builder page at /admin/form-builder for an admin user", async () => {
    vi.spyOn(templatesService, "list").mockResolvedValue([]);
    setAppSelected("questionnaire");
    const user = makeTestUser({ role: "admin" });
    await renderRouterAt("/admin/form-builder", { isAuthenticated: true, user, isAdmin: true });
    expect(await screen.findByRole("heading", { name: "Form Builder" })).toBeInTheDocument();
  });

  it("renders the configuration page at /admin/configuration for an admin user", async () => {
    setAppSelected("questionnaire");
    const user = makeTestUser({ role: "admin" });
    await renderRouterAt("/admin/configuration", { isAuthenticated: true, user, isAdmin: true });
    expect(
      await screen.findByRole("heading", { name: "Platform Configuration" }),
    ).toBeInTheDocument();
  });
});

describe("App", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("renders without throwing, landing on the login page for an unauthenticated visitor", async () => {
    vi.resetModules();
    window.history.pushState({}, "", "/");
    // Fresh module registry (see renderRouterAt above) — mock the service
    // instance that App's own dynamically-imported dependency graph resolves,
    // not the statically-imported one at the top of this file.
    const { authService: freshAuthService } = await import("@/services");
    vi.spyOn(freshAuthService, "getCurrentUser").mockResolvedValue(null as never);
    const { default: App } = await import("@/app/App");
    render(<App />);
    expect(await screen.findByText("Welcome back")).toBeInTheDocument();
  });
});
