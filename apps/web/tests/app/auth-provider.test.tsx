import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AuthProvider } from "@/app/auth-provider";
import { useAuth } from "@/app/auth-context";
import { authService } from "@/services";
import { ApiError } from "@/services/api/errors";

function Probe() {
  const ctx = useAuth();
  return (
    <div>
      <span data-testid="user">{ctx.user?.name ?? "anon"}</span>
      <span data-testid="admin">{String(ctx.isAdmin)}</span>
      <span data-testid="auth">{String(ctx.isAuthenticated)}</span>
      <span data-testid="loading">{String(ctx.isLoading)}</span>
    </div>
  );
}

function withQueryClient(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{node}</QueryClientProvider>;
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports an unauthenticated context when the user is null", async () => {
    vi.spyOn(authService, "getCurrentUser").mockResolvedValue(null as never);
    render(withQueryClient(<AuthProvider><Probe /></AuthProvider>));
    await waitFor(() => {
      expect(screen.getByTestId("auth")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("admin")).toHaveTextContent("false");
  });

  it("reports the user when the API resolves", async () => {
    vi.spyOn(authService, "getCurrentUser").mockResolvedValue({
      id: "u1",
      name: "Jane",
      email: "j@e.com",
      role: "admin",
      title: "Admin",
      initials: "J",
    });
    render(withQueryClient(<AuthProvider><Probe /></AuthProvider>));
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("Jane");
    });
    expect(screen.getByTestId("auth")).toHaveTextContent("true");
    expect(screen.getByTestId("admin")).toHaveTextContent("true");
  });

  it("falls back to unauthenticated when the API throws a non-retriable ApiError", async () => {
    vi.spyOn(authService, "getCurrentUser").mockRejectedValue(new ApiError("UNAUTHORIZED", "no", 401));
    render(withQueryClient(<AuthProvider><Probe /></AuthProvider>));
    await waitFor(() => {
      expect(screen.getByTestId("auth")).toHaveTextContent("false");
    });
  });

  it("isAdmin reflects the user's role", async () => {
    vi.spyOn(authService, "getCurrentUser").mockResolvedValue({
      id: "u2",
      name: "Not Admin",
      email: "n@e.com",
      role: "analyst",
      title: "Analyst",
      initials: "N",
    });
    render(withQueryClient(<AuthProvider><Probe /></AuthProvider>));
    await waitFor(() => {
      expect(screen.getByTestId("admin")).toHaveTextContent("false");
    });
  });
});
