import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetricCard } from "@/components/common/MetricCard";

describe("MetricCard", () => {
  it("renders the label and value", () => {
    render(<MetricCard label="Active cases" value={42} />);
    expect(screen.getByText("Active cases")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders string values", () => {
    render(<MetricCard label="Status" value="Online" />);
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("renders the hint when provided", () => {
    render(<MetricCard label="X" value={1} hint="+10 vs last week" />);
    expect(screen.getByText("+10 vs last week")).toBeInTheDocument();
  });

  it("does not render a hint node when omitted", () => {
    render(<MetricCard label="X" value={1} />);
    expect(screen.queryByText("+10 vs last week")).not.toBeInTheDocument();
  });

  it("applies the navy tone by default", () => {
    const { container } = render(<MetricCard label="X" value={1} />);
    const valueEl = container.querySelector(".text-3xl") as HTMLElement;
    expect(valueEl.className).toContain("text-navy");
  });

  it("applies other tones when specified", () => {
    const tones = ["navy", "green", "amber", "red"] as const;
    for (const tone of tones) {
      const { container, unmount } = render(<MetricCard label="X" value={1} tone={tone} />);
      const valueEl = container.querySelector(".text-3xl") as HTMLElement;
      expect(valueEl.className).toMatch(/text-(navy|status-)/);
      unmount();
    }
  });
});
