import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProviders } from "@/app/providers";
import { AuthProvider } from "@/app/auth-provider";
import { useAuth } from "@/app/auth-context";
import App from "@/app/App";

vi.mock("@/app/router", () => ({
  AppRouter: () => <div data-testid="app-router">Router</div>,
}));

vi.mock("@/lib/auth-session", () => ({
  CURRENT_USER_QUERY_KEY: ["current-user"],
  fetchCurrentUser: vi.fn().mockResolvedValue({
    id: "u-1",
    name: "Admin User",
    email: "admin@cedarrose.local",
    role: "admin",
    initials: "AU",
  }),
}));

function AuthProbe() {
  const auth = useAuth();
  return (
    <div>
      <span>{auth.isAuthenticated ? "yes" : "no"}</span>
      <span>{auth.user?.email}</span>
    </div>
  );
}

describe("App", () => {
  it("renders providers and router", () => {
    render(<App />);
    expect(screen.getByTestId("app-router")).toBeInTheDocument();
  });
});

describe("AppProviders", () => {
  it("renders children with auth and tooltip context", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <AppProviders>
          <div>Child content</div>
        </AppProviders>
      </QueryClientProvider>,
    );
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });
});

describe("AuthProvider", () => {
  it("exposes authenticated user context", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("yes")).toBeInTheDocument();
    expect(screen.getByText("admin@cedarrose.local")).toBeInTheDocument();
  });
});
