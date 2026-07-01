import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthPageShell, authButtonClassName, authInputClassName, authLabelClassName, authLinkClassName } from "@/features/auth/components/AuthPageShell";

describe("AuthPageShell", () => {
  it("renders title and subtitle", () => {
    render(
      <AuthPageShell title="My Title" subtitle="My subtitle">
        <p>body</p>
      </AuthPageShell>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("My Title");
    expect(screen.getByText("My subtitle")).toBeInTheDocument();
  });

  it("renders children", () => {
    render(
      <AuthPageShell title="t" subtitle="s">
        <button>click me</button>
      </AuthPageShell>,
    );
    expect(screen.getByRole("button", { name: "click me" })).toBeInTheDocument();
  });

  it("applies the shake class when shake is true", () => {
    const { container } = render(
      <AuthPageShell title="t" subtitle="s" shake>
        <span>x</span>
      </AuthPageShell>,
    );
    expect(container.innerHTML).toContain("cr-shake");
  });

  it("does not apply the shake class by default", () => {
    const { container } = render(
      <AuthPageShell title="t" subtitle="s">
        <span>x</span>
      </AuthPageShell>,
    );
    expect(container.innerHTML).not.toContain("cr-shake");
  });

  it("exposes styling constants", () => {
    expect(authInputClassName).toContain("h-11");
    expect(authLabelClassName).toContain("block");
    expect(authButtonClassName).toContain("h-[46px]");
    expect(authLinkClassName).toContain("no-underline");
  });
});
