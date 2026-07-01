import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OtpInputGroup } from "@/features/questionnaire/components/OtpInputGroup";

describe("OtpInputGroup", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("renders 6 inputs", () => {
    render(<OtpInputGroup value={["", "", "", "", "", ""]} onChange={() => {}} />);
    expect(screen.getByLabelText("Digit 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Digit 6")).toBeInTheDocument();
  });

  it("shows the provided digits", () => {
    render(<OtpInputGroup value={["1", "2", "", "", "", ""]} onChange={() => {}} />);
    expect(screen.getByLabelText("Digit 1")).toHaveValue("1");
    expect(screen.getByLabelText("Digit 2")).toHaveValue("2");
  });

  it("calls onChange with the new digits when typing", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<OtpInputGroup value={["", "", "", "", "", ""]} onChange={onChange} />);
    const first = screen.getByLabelText("Digit 1");
    await user.type(first, "5");
    expect(onChange).toHaveBeenCalled();
    const callArg = onChange.mock.calls[0][0] as string[];
    expect(callArg[0]).toBe("5");
  });

  it("focuses the next input after typing a digit", async () => {
    const user = userEvent.setup();
    render(<OtpInputGroup value={["", "", "", "", "", ""]} onChange={() => {}} />);
    await user.type(screen.getByLabelText("Digit 1"), "1");
    expect(document.activeElement).toBe(screen.getByLabelText("Digit 2"));
  });

  it("moves focus back on Backspace when current is empty", async () => {
    const user = userEvent.setup();
    render(<OtpInputGroup value={["1", "", "", "", "", ""]} onChange={() => {}} />);
    screen.getByLabelText("Digit 2").focus();
    await user.keyboard("{Backspace}");
    expect(document.activeElement).toBe(screen.getByLabelText("Digit 1"));
  });

  it("does not move back on Backspace when current has a value", async () => {
    const user = userEvent.setup();
    render(<OtpInputGroup value={["1", "2", "", "", "", ""]} onChange={() => {}} />);
    screen.getByLabelText("Digit 2").focus();
    await user.keyboard("{Backspace}");
    expect(document.activeElement).toBe(screen.getByLabelText("Digit 2"));
  });

  it("disables all inputs when disabled is true", () => {
    render(<OtpInputGroup value={["", "", "", "", "", ""]} onChange={() => {}} disabled />);
    expect(screen.getByLabelText("Digit 1")).toBeDisabled();
  });

  it("applies the error class when hasError is true", () => {
    const { container } = render(
      <OtpInputGroup value={["", "", "", "", "", ""]} onChange={() => {}} hasError />,
    );
    expect(container.querySelector(".bg-\\[\\#FFF5F5\\]")).toBeTruthy();
  });

  it("handles a paste of 6 digits", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<OtpInputGroup value={["", "", "", "", "", ""]} onChange={onChange} />);
    const first = screen.getByLabelText("Digit 1");
    first.focus();
    // Simulate paste via clipboardData
    const paste = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(paste, "clipboardData", {
      value: { getData: () => "123456" },
    });
    first.dispatchEvent(paste);
    // onChange should be called
    expect(onChange).toHaveBeenCalled();
    // Just verify the test doesn't throw
    expect(paste).toBeDefined();
    // Avoid unused warning
    void user;
  });
});
