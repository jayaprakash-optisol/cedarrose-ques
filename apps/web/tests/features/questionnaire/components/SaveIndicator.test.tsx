import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SaveIndicator } from "@/features/questionnaire/components/SaveIndicator";

describe("SaveIndicator", () => {
  it("shows the 'Saving…' state when isSaving is true", () => {
    render(<SaveIndicator isSaving savedAt={null} />);
    expect(screen.getByText("Saving…")).toBeInTheDocument();
  });

  it("shows the 'All changes saved' state when savedAt is set", () => {
    render(<SaveIndicator isSaving={false} savedAt={new Date("2026-06-15T10:00:00.000Z")} />);
    expect(screen.getByText("All changes saved")).toBeInTheDocument();
  });

  it("renders nothing when not saving and not saved", () => {
    const { container } = render(<SaveIndicator isSaving={false} savedAt={null} />);
    expect(container.firstChild).toBeNull();
  });
});
