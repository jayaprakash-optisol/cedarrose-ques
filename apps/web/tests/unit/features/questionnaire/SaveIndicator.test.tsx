import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SaveIndicator } from "@/features/questionnaire/components/SaveIndicator";

describe("SaveIndicator", () => {
  it("shows saving state", () => {
    render(<SaveIndicator isSaving savedAt={null} />);
    expect(screen.getByText("Saving…")).toBeInTheDocument();
  });

  it("shows saved state", () => {
    render(<SaveIndicator isSaving={false} savedAt={new Date()} />);
    expect(screen.getByText("All changes saved")).toBeInTheDocument();
  });

  it("renders nothing when idle", () => {
    const { container } = render(<SaveIndicator isSaving={false} savedAt={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
