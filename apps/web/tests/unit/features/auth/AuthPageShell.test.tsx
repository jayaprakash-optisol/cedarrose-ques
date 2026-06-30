import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthPageShell } from "@/features/auth/components/AuthPageShell";

describe("AuthPageShell", () => {
  it("renders title, subtitle, and children", () => {
    render(
      <AuthPageShell title="Sign in" subtitle="Welcome back">
        <button type="button">Continue</button>
      </AuthPageShell>
    );
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
  });
});
