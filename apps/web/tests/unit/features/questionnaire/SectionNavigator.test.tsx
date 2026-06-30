import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SectionNavigator } from "@/features/questionnaire/components/SectionNavigator";

describe("SectionNavigator", () => {
  it("renders section buttons and navigates completed sections", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    const completed = new Set([0, 1]);

    render(
      <SectionNavigator total={3} current={1} completed={completed} onNavigate={onNavigate} />,
    );

    expect(screen.getByLabelText("Section 1 (complete)")).toBeInTheDocument();
    expect(screen.getByLabelText("Section 2 (complete)")).toHaveAttribute("aria-current", "step");
    expect(screen.getByLabelText("Section 3")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Section 1 (complete)"));
    expect(onNavigate).toHaveBeenCalledWith(0);

    await user.click(screen.getByLabelText("Section 3"));
    expect(onNavigate).not.toHaveBeenCalledWith(2);
  });
});
