import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CedarLogo } from "@/components/CedarLogo";

describe("CedarLogo", () => {
  it("renders CR mark and Cedar Rose text by default", () => {
    render(<CedarLogo />);
    expect(screen.getByText("CR")).toBeInTheDocument();
    expect(screen.getByText("Cedar Rose")).toBeInTheDocument();
  });

  it("hides text when withText is false", () => {
    render(<CedarLogo withText={false} />);
    expect(screen.getByText("CR")).toBeInTheDocument();
    expect(screen.queryByText("Cedar Rose")).not.toBeInTheDocument();
  });

  it("supports custom size without text", () => {
    render(<CedarLogo size={32} withText={false} />);
    expect(screen.getByText("CR")).toBeInTheDocument();
    expect(screen.queryByText("Cedar Rose")).not.toBeInTheDocument();
  });
});
