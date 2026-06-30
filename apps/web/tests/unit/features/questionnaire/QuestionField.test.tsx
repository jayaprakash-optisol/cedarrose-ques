import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuestionField } from "@/features/questionnaire/components/QuestionField";
import type { Question } from "@/types/template";

function renderField(question: Question, value = "", onChange = vi.fn()) {
  const view = render(
    <QuestionField question={question} value={value} onChange={onChange} />,
  );
  return { onChange, ...view };
}

describe("QuestionField", () => {
  it("renders default text input", async () => {
    const user = userEvent.setup();
    const { onChange } = renderField({ id: "q1", text: "Company name", type: "text", required: true });
    const input = screen.getByPlaceholderText(/enter company name/i);
    await user.type(input, "Acme");
    expect(onChange).toHaveBeenCalled();
  });

  it("renders repeater fields", async () => {
    const user = userEvent.setup();
    const { onChange } = renderField({
      id: "q2",
      text: "Branch",
      type: "text",
      required: false,
      repeater: true,
    });

    await user.click(screen.getByRole("button", { name: /add another branch/i }));
    expect(onChange).toHaveBeenCalled();
  });

  it("renders multiselect checkboxes", async () => {
    const user = userEvent.setup();
    const { onChange } = renderField({
      id: "q3",
      text: "Services",
      type: "multiselect",
      required: false,
      options: ["A", "B"],
    });

    await user.click(screen.getByText("A"));
    expect(onChange).toHaveBeenCalledWith("A");
  });

  it("renders radio group", async () => {
    const user = userEvent.setup();
    const { onChange } = renderField({
      id: "q4",
      text: "Choice",
      type: "radio",
      required: true,
      options: ["Yes", "No"],
    });

    await user.click(screen.getByText("Yes"));
    expect(onChange).toHaveBeenCalledWith("Yes");
  });

  it("renders date, number, url, file, toggle, and longtext variants", async () => {
    const user = userEvent.setup();

    const dateChange = vi.fn();
    const { unmount: unmountDate } = renderField(
      { id: "d", text: "Date", type: "date", required: true },
      "",
      dateChange,
    );
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    await user.type(dateInput, "2026-06-01");
    expect(dateChange).toHaveBeenCalled();
    unmountDate();

    const numberChange = vi.fn();
    renderField({ id: "n", text: "Count", type: "number", required: true }, "", numberChange);
    await user.type(screen.getAllByRole("spinbutton")[0], "5");
    expect(numberChange).toHaveBeenCalled();

    const urlChange = vi.fn();
    renderField({ id: "u", text: "Website", type: "url", required: false }, "", urlChange);
    await user.type(screen.getByPlaceholderText("https://"), "https://acme.com");
    expect(urlChange).toHaveBeenCalled();

    const fileChange = vi.fn();
    renderField({ id: "f", text: "Upload", type: "file", required: false }, "", fileChange);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
    await user.upload(fileInput, file);
    expect(fileChange).toHaveBeenCalledWith("doc.pdf");

    const toggleChange = vi.fn();
    renderField({ id: "t", text: "Agree", type: "toggle", required: true }, "false", toggleChange);
    await user.click(screen.getByRole("switch"));
    expect(toggleChange).toHaveBeenCalledWith("true");

    const longChange = vi.fn();
    renderField(
      {
        id: "l",
        text: "Address",
        type: "longtext",
        required: true,
        sameAsToggleLabel: "Same as above",
        validation: { maxLength: 100 },
      },
      "",
      longChange,
    );
    await user.click(screen.getByText("Same as above"));
    expect(longChange).toHaveBeenCalledWith("[Same as above]");
  });

  it("removes repeater row and unchecks same-as toggle", async () => {
    const user = userEvent.setup();
    const { onChange } = renderField({
      id: "q2",
      text: "Branch",
      type: "text",
      required: false,
      repeater: true,
    }, "Line1\nLine2");

    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    await user.click(removeButtons[0]);
    expect(onChange).toHaveBeenCalled();

    const longChange = vi.fn();
    const { unmount } = renderField(
      {
        id: "lt",
        text: "Address",
        type: "longtext",
        required: false,
        sameAsToggleLabel: "Same as above",
      },
      "Original",
      longChange,
    );
    await user.click(screen.getByRole("switch"));
    expect(longChange).toHaveBeenCalledWith("[Same as above]");
    await user.click(screen.getByRole("switch"));
    expect(longChange).toHaveBeenCalledWith("");
    unmount();
  });

  it("renders dropdown, table, esign, and text max length counter", async () => {
    const user = userEvent.setup();

    const dropdownChange = vi.fn();
    renderField(
      { id: "dd", text: "Type", type: "dropdown", required: true, options: ["A", "B"] },
      "",
      dropdownChange,
    );
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "B" }));
    expect(dropdownChange).toHaveBeenCalledWith("B");

    const supportChange = vi.fn();
    const { unmount: unmountSupport } = renderField(
      { id: "sd", text: "Document", type: "support_doc", required: true },
      "",
      supportChange,
    );
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
    await user.upload(fileInput, file);
    expect(supportChange).toHaveBeenCalledWith("doc.pdf");
    unmountSupport();

    const esignChange = vi.fn();
    const { unmount: unmountEsign } = renderField(
      { id: "es", text: "Sign", type: "esign", required: true },
      "false",
      esignChange,
    );
    await user.click(screen.getByRole("switch"));
    expect(esignChange).toHaveBeenCalledWith("true");
    unmountEsign();

    renderField(
      { id: "tx", text: "Name", type: "text", required: true, validation: { maxLength: 10 } },
      "abc",
      vi.fn(),
    );
    expect(screen.getByText("3/10")).toBeInTheDocument();
  });
});
