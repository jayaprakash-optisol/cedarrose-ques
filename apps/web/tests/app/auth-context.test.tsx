import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { useAuth } from "@/app/auth-context";

function Probe() {
  const ctx = useAuth();
  return (
    <div>
      <span data-testid="user">{ctx.user?.name ?? "anon"}</span>
      <span data-testid="admin">{String(ctx.isAdmin)}</span>
      <span data-testid="auth">{String(ctx.isAuthenticated)}</span>
    </div>
  );
}

describe("auth-context", () => {
  it("provides default values when no provider is mounted", () => {
    render(<Probe />);
    expect(screen.getByTestId("user")).toHaveTextContent("anon");
    expect(screen.getByTestId("admin")).toHaveTextContent("false");
    expect(screen.getByTestId("auth")).toHaveTextContent("false");
  });
});
