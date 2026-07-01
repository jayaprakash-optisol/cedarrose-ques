import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SectionNavigator } from "@/features/questionnaire/components/SectionNavigator";

describe("SectionNavigator", () => {
  it("renders the section buttons", () => {
    render(<SectionNavigator total={3} current={0} completed={new Set()} onNavigate={() => {}} />);
    expect(screen.getByLabelText("Section 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Section 2")).toBeInTheDocument();
    expect(screen.getByLabelText("Section 3")).toBeInTheDocument();
  });

  it("marks the current section as aria-current=step", () => {
    render(<SectionNavigator total={2} current={1} completed={new Set()} onNavigate={() => {}} />);
    const section1 = screen.getByLabelText("Section 1");
    const section2 = screen.getByLabelText("Section 2");
    expect(section1.getAttribute("aria-current")).toBeNull();
    expect(section2.getAttribute("aria-current")).toBe("step");
  });

  it("calls onNavigate when a completed section is clicked", async () => {
    const user = userEvent.setup();
    const onNav = vi.fn();
    render(<SectionNavigator total={3} current={0} completed={new Set([0, 1])} onNavigate={onNav} />);
    await user.click(screen.getByLabelText("Section 2 (complete)"));
    expect(onNav).toHaveBeenCalledWith(1);
  });

  it("does not call onNavigate for a pending section", async () => {
    const user = userEvent.setup();
    const onNav = vi.fn();
    render(<SectionNavigator total={3} current={0} completed={new Set([0])} onNavigate={onNav} />);
    await user.click(screen.getByLabelText("Section 2"));
    expect(onNav).not.toHaveBeenCalled();
  });
});
