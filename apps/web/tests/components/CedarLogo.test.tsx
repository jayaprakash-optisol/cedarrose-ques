import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CedarLogo } from "@/components/CedarLogo";

describe("CedarLogo", () => {
  it("renders with text by default", () => {
    render(<CedarLogo />);
    expect(screen.getByText("CR")).toBeInTheDocument();
    expect(screen.getByText("Cedar Rose")).toBeInTheDocument();
  });

  it("hides the text when withText=false", () => {
    render(<CedarLogo withText={false} />);
    expect(screen.queryByText("Cedar Rose")).not.toBeInTheDocument();
  });

  it("uses the 48px size by default with the 10/18 metrics", () => {
    const { container } = render(<CedarLogo />);
    const badge = container.querySelector("div[style]") as HTMLElement;
    expect(badge.style.width).toBe("48px");
    expect(badge.style.height).toBe("48px");
    expect(badge.style.borderRadius).toBe("10px");
    expect(badge.style.fontSize).toBe("18px");
  });

  it("uses the 8/14 metrics for any other size", () => {
    const { container } = render(<CedarLogo size={32} />);
    const badge = container.querySelector("div[style]") as HTMLElement;
    expect(badge.style.width).toBe("32px");
    expect(badge.style.height).toBe("32px");
    expect(badge.style.borderRadius).toBe("8px");
    expect(badge.style.fontSize).toBe("14px");
  });
});
