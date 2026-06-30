import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OtpInputGroup } from "@/features/questionnaire/components/OtpInputGroup";

describe("OtpInputGroup", () => {
  it("renders six digit inputs", () => {
    render(<OtpInputGroup value={Array(6).fill("")} onChange={vi.fn()} />);
    expect(screen.getAllByRole("textbox")).toHaveLength(6);
  });

  it("calls onChange when digit entered", () => {
    const onChange = vi.fn();
    render(<OtpInputGroup value={Array(6).fill("")} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Digit 1"), { target: { value: "5" } });
    expect(onChange).toHaveBeenCalledWith(["5", "", "", "", "", ""]);
  });

  it("pastes full code into inputs", () => {
    const onChange = vi.fn();
    render(<OtpInputGroup value={Array(6).fill("")} onChange={onChange} />);
    fireEvent.paste(screen.getByLabelText("Digit 1"), {
      clipboardData: { getData: () => "123456" },
    });
    expect(onChange).toHaveBeenCalledWith(["1", "2", "3", "4", "5", "6"]);
  });
});
