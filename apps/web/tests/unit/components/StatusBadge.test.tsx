import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge, ResearcherBadge, RecipientBadge } from "@/components/common/StatusBadge";

describe("StatusBadge components", () => {
  it("renders case status badge", () => {
    render(<StatusBadge status="SENT" />);
    expect(screen.getByText("SENT")).toBeInTheDocument();
  });

  it("renders researcher and recipient badges", () => {
    render(
      <>
        <ResearcherBadge status="Awaiting Review" />
        <RecipientBadge type="Supplier" />
      </>,
    );
    expect(screen.getByText("Awaiting Review")).toBeInTheDocument();
    expect(screen.getByText("Supplier")).toBeInTheDocument();
  });
});
