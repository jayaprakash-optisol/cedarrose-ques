import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResearcherBadge, RecipientBadge, StatusBadge } from "@/components/common/StatusBadge";
import type { CaseStatus, ResearcherStatus } from "@/types/case";

const ALL_STATUSES: CaseStatus[] = [
  "SENT",
  "OPENED",
  "IN PROGRESS",
  "COMPLETED",
  "COMPLETED — MISSING DATA",
  "PENDING CONTACT",
  "PENDING LINKAGE & CONTACT",
  "EXPIRED",
  "NOT SENT",
];

const ALL_RESEARCHER: ResearcherStatus[] = [
  "Not Applicable",
  "Awaiting Review",
  "Approved",
  "Flagged",
  "Rejected",
];

describe("StatusBadge", () => {
  it.each(ALL_STATUSES)("renders badge for %s", (status) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(status)).toBeInTheDocument();
  });

  it("renders the warning icon for 'COMPLETED — MISSING DATA'", () => {
    const { container } = render(<StatusBadge status="COMPLETED — MISSING DATA" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("does not render the warning icon for other statuses", () => {
    const { container } = render(<StatusBadge status="SENT" />);
    const svgs = container.querySelectorAll("svg");
    // lucide icons are SVGs, but the alert triangle adds an additional one
    expect(svgs.length).toBeLessThanOrEqual(1);
  });
});

describe("ResearcherBadge", () => {
  it.each(ALL_RESEARCHER)("renders badge for %s", (status) => {
    render(<ResearcherBadge status={status} />);
    expect(screen.getByText(status)).toBeInTheDocument();
  });
});

describe("RecipientBadge", () => {
  it("renders the supplied type", () => {
    render(<RecipientBadge type="Supplier" />);
    expect(screen.getByText("Supplier")).toBeInTheDocument();
  });
});
