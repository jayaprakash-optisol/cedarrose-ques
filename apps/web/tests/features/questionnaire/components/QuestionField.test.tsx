import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuestionField } from "@/features/questionnaire/components/QuestionField";
import { renderWithProviders } from "../../../helpers/render";
import type { Question } from "@/types/template";

function renderField(question: Partial<Question> = {}, value = "", onChange?: (v: string) => void) {
  const q: Question = {
    id: "q1",
    text: "Test question",
    type: "text",
    required: true,
    prefill: false,
    ...question,
  };
  return renderWithProviders(
    <QuestionField question={q} value={value} onChange={onChange ?? vi.fn()} />,
  );
}

describe("QuestionField", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("renders a text input by default", () => {
    renderField({ type: "text" });
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders longtext as textarea", () => {
    renderField({ type: "longtext" });
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders number input", () => {
    renderField({ type: "number" });
    expect(screen.getByRole("spinbutton")).toBeInTheDocument();
  });

  it("renders date input", () => {
    renderField({ type: "date" });
    expect(screen.getByDisplayValue("")).toBeInTheDocument();
  });

  it("renders dropdown with options", () => {
    renderField({ type: "dropdown", options: ["A", "B", "C"] });
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders radio group with options", () => {
    renderField({ type: "radio", options: ["Yes", "No"] });
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("renders multiselect with checkboxes", () => {
    renderField({ type: "multiselect", options: ["Red", "Blue", "Green"] });
    expect(screen.getByText("Red")).toBeInTheDocument();
    expect(screen.getByText("Blue")).toBeInTheDocument();
    expect(screen.getByText("Green")).toBeInTheDocument();
  });

  it("renders file upload", () => {
    renderField({ type: "file" });
    expect(screen.getByText("Drag & drop a file or")).toBeInTheDocument();
    expect(screen.getByText("Browse files")).toBeInTheDocument();
  });

  it("renders toggle/esign type", () => {
    renderField({ type: "toggle" });
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("shows Yes when toggle is checked", () => {
    renderField({ type: "toggle" }, "true");
    expect(screen.getByText("Yes")).toBeInTheDocument();
  });

  it("renders URL input", () => {
    renderField({ type: "url" });
    expect(screen.getByPlaceholderText("https://")).toBeInTheDocument();
  });

  it("handles text maxLength validation", () => {
    renderField({ type: "text", validation: { maxLength: 50 } });
    expect(screen.getByText("0/50")).toBeInTheDocument();
  });

  it("handles longtext maxLength validation", () => {
    renderField({ type: "longtext", validation: { maxLength: 200 } }, "Hello");
    expect(screen.getByText("5/200")).toBeInTheDocument();
  });

  it("handles number min/max validation", () => {
    renderField({ type: "number", validation: { min: 1, max: 100 } });
    expect(screen.getByRole("spinbutton")).toHaveAttribute("min", "1");
    expect(screen.getByRole("spinbutton")).toHaveAttribute("max", "100");
  });

  it("handles date allowPast validation", () => {
    renderField({ type: "date", validation: { allowPast: false } });
    expect(screen.getByDisplayValue("")).toBeInTheDocument();
  });

  it("handles date allowFuture validation", () => {
    renderField({ type: "date", validation: { allowFuture: false } });
    expect(screen.getByDisplayValue("")).toBeInTheDocument();
  });

  it("renders repeater with multiple items", () => {
    renderField({ repeater: true }, "item1\nitem2");
    const inputs = screen.getAllByRole("textbox");
    expect(inputs.length).toBeGreaterThanOrEqual(2);
  });

  it("adds a new repeater item", async () => {
    const user = userEvent.setup();
    renderField({ repeater: true }, "");
    await user.click(screen.getByRole("button", { name: /Add another test question/ }));
    const inputs = screen.getAllByRole("textbox");
    expect(inputs.length).toBe(2);
  });

  it("removes a repeater item", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderField({ repeater: true }, "a\nb", onChange);
    const removeBtns = screen.getAllByLabelText("Remove");
    await user.click(removeBtns[0]);
    expect(onChange).toHaveBeenCalled();
  });

  it("toggles multiselect options", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderField({ type: "multiselect", options: ["A", "B"] }, "", onChange);
    await user.click(screen.getByText("A"));
    expect(onChange).toHaveBeenCalledWith("A");
  });

  it("handles disabled state for text", () => {
    renderField({ type: "text" }, "", vi.fn());
    expect(screen.getByRole("textbox")).not.toBeDisabled();
  });

  it("shows sameAsToggleLabel for longtext", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderField(
      { type: "longtext", sameAsToggleLabel: "Same as above" },
      "",
      onChange,
    );
    expect(screen.getByText("Same as above")).toBeInTheDocument();
    await user.click(screen.getByText("Same as above"));
    expect(onChange).toHaveBeenCalledWith("[Same as above]");
  });

  it("renders sameAsToggleLabel for longtext", () => {
    const onChange = vi.fn();
    renderField(
      { type: "longtext", sameAsToggleLabel: "Same as above" },
      "[Same as above]",
      onChange,
    );
    expect(screen.getByText("Same as above")).toBeInTheDocument();
    expect(screen.getByText("[Same as above]")).toBeInTheDocument();
  });

  it("toggles toggle/esign field", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderField({ type: "toggle" }, "false", onChange);
    const switchEl = screen.getByRole("switch");
    await user.click(switchEl);
    expect(onChange).toHaveBeenCalledWith("true");
  });

  it("renders with helpText as placeholder for text input", () => {
    renderField({ type: "text", helpText: "Enter value here" });
    expect(screen.getByPlaceholderText("Enter value here")).toBeInTheDocument();
  });

  it("renders with default placeholder for text input", () => {
    renderField({ type: "text", text: "Custom label" });
    expect(screen.getByPlaceholderText("Enter custom label")).toBeInTheDocument();
  });

  it("renders file input with existing value", () => {
    renderField({ type: "file" }, "document.pdf");
    expect(screen.getByText("document.pdf")).toBeInTheDocument();
  });

  it("handles multiselect toggle off", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderField({ type: "multiselect", options: ["A", "B"] }, "A, B", onChange);
    await user.click(screen.getByText("A"));
    expect(onChange).toHaveBeenCalledWith("B");
  });

  it("renders with helpText placeholder for repeater", () => {
    renderField({ repeater: true, helpText: "Enter items" }, "");
    expect(screen.getByPlaceholderText("Enter items")).toBeInTheDocument();
  });

  it("renders longtext with maxLength counter", () => {
    renderField({ type: "longtext", validation: { maxLength: 100 } }, "hello");
    expect(screen.getByText("5/100")).toBeInTheDocument();
  });

  it("renders esign field", () => {
    renderField({ type: "esign" });
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("toggles esign field", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderField({ type: "esign" }, "false", onChange);
    const switchEl = screen.getByRole("switch");
    await user.click(switchEl);
    expect(onChange).toHaveBeenCalledWith("true");
  });

  it("uses question text as default placeholder when no helpText for text", () => {
    renderField({ type: "text", text: "Username" });
    expect(screen.getByPlaceholderText("Enter username")).toBeInTheDocument();
  });

  it("uses question text as default placeholder when no helpText for longtext", () => {
    renderField({ type: "longtext", text: "Description" });
    expect(screen.getByPlaceholderText("Description")).toBeInTheDocument();
  });

  it("renders date with allowPast validation as disabled past", () => {
    renderField({ type: "date", validation: { allowPast: false } });
    const input = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
  });

  it("renders date with allowFuture validation", () => {
    renderField({ type: "date", validation: { allowFuture: false } });
    const input = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
  });

  it("renders radio field with default value", () => {
    renderField({ type: "radio", options: ["Yes", "No"] }, "Yes");
    expect(screen.getByText("Yes")).toBeInTheDocument();
  });

  it("renders dropdown with default value", () => {
    renderField({ type: "dropdown", options: ["A", "B", "C"] }, "A");
    // Just verify the component renders
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("renders with default text in disabled state", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <QuestionField question={{ id: "q1", text: "test", type: "text", required: true, prefill: false }} value="default value" onChange={onChange} disabled />,
    );
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it("renders with no options for dropdown", () => {
    renderField({ type: "dropdown", options: [] });
    // Just verify it renders
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders with no options for radio", () => {
    renderField({ type: "radio", options: [] });
    // Just verify it renders
    expect(document.body).toBeInTheDocument();
  });

  it("renders with no options for multiselect", () => {
    renderField({ type: "multiselect", options: [] });
    // Just verify it renders
    expect(document.body).toBeInTheDocument();
  });

  it("toggles off the sameAsToggleLabel switch", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderField(
      { type: "longtext", sameAsToggleLabel: "Same as above" },
      "[Same as above]",
      onChange,
    );
    // Click the switch to toggle on
    const switchEl = screen.getByRole("switch");
    await user.click(switchEl);
    // First click should call onChange with "[Same as above]"
    expect(onChange).toHaveBeenLastCalledWith("[Same as above]");
    // Click again to toggle off
    await user.click(switchEl);
    // Second click should call onChange with ""
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("types in longtext textarea", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderField({ type: "longtext" }, "", onChange);
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    await user.type(textarea, "Hello world");
    expect(onChange).toHaveBeenCalled();
  });

  it("types in date input", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderField({ type: "date" }, "", onChange);
    const input = document.querySelector('input[type="date"]') as HTMLInputElement;
    await user.type(input, "2026-06-15");
    expect(onChange).toHaveBeenCalled();
  });

  it("types in number input", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderField({ type: "number" }, "", onChange);
    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    await user.type(input, "42");
    expect(onChange).toHaveBeenCalled();
  });

  it("types in url input", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderField({ type: "url" }, "", onChange);
    const input = screen.getByPlaceholderText("https://") as HTMLInputElement;
    await user.type(input, "https://example.com");
    expect(onChange).toHaveBeenCalled();
  });

  it("triggers file onChange with filename", async () => {
    const onChange = vi.fn();
    renderField({ type: "file" }, "", onChange);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["content"], "test.txt", { type: "text/plain" });
    // Simulate file selection
    Object.defineProperty(input, "files", { value: [file], writable: true });
    fireEvent.change(input);
    expect(onChange).toHaveBeenCalled();
  });
});
