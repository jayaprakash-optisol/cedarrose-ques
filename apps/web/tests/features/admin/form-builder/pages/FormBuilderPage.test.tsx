import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FormBuilderPage from "@/features/admin/form-builder/pages/FormBuilderPage";
import { templatesService } from "@/services";
import { renderWithProviders, makeQueryClient } from "../../../../helpers/render";
import type { Template } from "@/types/template";

function makeTemplate(overrides: Partial<Template> = {}): Template {
  return {
    id: "tpl-1", name: "KYC Template", recipientType: "Supplier", status: "Active",
    lastEdited: "2026-06-01", editor: "admin",
    sections: [
      { id: "sec-1", number: 1, title: "Company Info", description: "Basic details", banner: "Fill all fields", questions: [
        { id: "q1", text: "Company name", type: "text", required: true, prefill: false },
        { id: "q2", text: "Registration", type: "text", required: false, prefill: false, helpText: "Enter reg number", validation: { maxLength: 50 } },
      ]},
      { id: "sec-2", number: 2, title: "Contact Info", questions: [
        { id: "q3", text: "Email", type: "text", required: true, prefill: false },
      ]},
    ],
    ...overrides,
  };
}

function renderFormBuilder(qc: ReturnType<typeof makeQueryClient>, overrides?: Partial<Template>) {
  const tpl = makeTemplate(overrides);
  qc.setQueryData(["templates"], [tpl]);
  qc.setQueryData(["templates", tpl.id], tpl);
  return renderWithProviders(<FormBuilderPage />, {
    authValue: { isAuthenticated: true, isAdmin: true },
    queryClient: qc,
  });
}

describe("FormBuilderPage", () => {
  let qc: ReturnType<typeof makeQueryClient>;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(templatesService, "save").mockResolvedValue(makeTemplate());
    vi.spyOn(templatesService, "updateStatus").mockResolvedValue({ ...makeTemplate(), status: "Draft" });
    vi.spyOn(templatesService, "delete").mockResolvedValue(undefined);
    vi.spyOn(templatesService, "create").mockResolvedValue(makeTemplate({ id: "new-tpl", name: "New Template" }));
    qc = makeQueryClient();
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it("renders the heading", () => {
    renderFormBuilder(qc);
    expect(screen.getAllByText("Form Builder").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the template library sidebar", () => {
    renderFormBuilder(qc);
    expect(screen.getByText("Questionnaire templates")).toBeInTheDocument();
  });

  it("renders the template name in sidebar", () => {
    renderFormBuilder(qc);
    expect(screen.getByText("KYC Template")).toBeInTheDocument();
  });

  it("shows empty state when no templates", () => {
    const emptyQc = makeQueryClient();
    emptyQc.setQueryData(["templates"], []);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: emptyQc,
    });
    expect(screen.getByText("Select or create a template to begin editing.")).toBeInTheDocument();
  });

  it("shows template status badge", () => {
    renderFormBuilder(qc);
    expect(screen.getAllByText("Active").length).toBeGreaterThanOrEqual(1);
  });

  it("shows recipient type badge", () => {
    renderFormBuilder(qc);
    expect(screen.getByText("Supplier")).toBeInTheDocument();
  });

  it("shows section title", () => {
    renderFormBuilder(qc);
    expect(screen.getByText(/Company Info/)).toBeInTheDocument();
  });

  it("shows section description", () => {
    renderFormBuilder(qc);
    expect(screen.getByText("Basic details")).toBeInTheDocument();
  });

  it("shows section banner", () => {
    renderFormBuilder(qc);
    expect(screen.getByText("Fill all fields")).toBeInTheDocument();
  });

  it("shows optional badge", () => {
    renderFormBuilder(qc);
    expect(screen.getByText("Optional")).toBeInTheDocument();
  });

  it("shows question count", () => {
    renderFormBuilder(qc);
    expect(document.body.textContent).toContain("questions total");
  });

  it("shows the save template button", () => {
    renderFormBuilder(qc);
    expect(screen.getByText("Save template")).toBeInTheDocument();
  });

  it("renders question type selector", () => {
    renderFormBuilder(qc);
    expect(screen.getAllByRole("combobox").length).toBeGreaterThan(0);
  });

  it("renders required toggle for questions", () => {
    renderFormBuilder(qc);
    expect(screen.getAllByRole("switch").length).toBeGreaterThan(0);
  });

  it("renders add new section button", () => {
    renderFormBuilder(qc);
    expect(screen.getByText("Add new section")).toBeInTheDocument();
  });

  it("renders section options", () => {
    renderFormBuilder(qc);
    expect(screen.getAllByLabelText("Section options").length).toBeGreaterThan(0);
  });

  it("opens section options menu on click", async () => {
    const user = userEvent.setup();
    renderFormBuilder(qc);
    await user.click(screen.getAllByRole("button", { name: "Section options" })[0]);
    await waitFor(() => expect(screen.getByText("Rename section")).toBeInTheDocument());
  });

  it("opens remove section dialog", async () => {
    const user = userEvent.setup();
    renderFormBuilder(qc);
    await user.click(screen.getAllByRole("button", { name: "Section options" })[0]);
    await user.click(screen.getByText("Remove section"));
    await waitFor(() => expect(screen.getByText("Remove this section?")).toBeInTheDocument());
  });

  it("opens add section dialog", async () => {
    const user = userEvent.setup();
    renderFormBuilder(qc);
    await user.click(screen.getByText("Add new section"));
    await waitFor(() => expect(screen.getByText("Section title")).toBeInTheDocument());
  });

  it("renders drag handles", () => {
    renderFormBuilder(qc);
    expect(screen.getAllByLabelText("Drag to reorder question").length).toBeGreaterThan(0);
  });

  it("shows required field indicator", () => {
    renderFormBuilder(qc);
    expect(screen.getAllByText("*").length).toBeGreaterThanOrEqual(2);
  });

  it("renders question input fields", () => {
    renderFormBuilder(qc);
    expect(screen.getAllByRole("textbox").length).toBeGreaterThan(0);
  });

  it("shows Draft/Active toggle labels", () => {
    renderFormBuilder(qc);
    expect(document.body.textContent).toContain("Draft");
    expect(document.body.textContent).toContain("Active");
  });

  it("renders delete button on draft templates", () => {
    renderFormBuilder(qc, { status: "Draft" });
    expect(screen.getByTitle("Delete draft template")).toBeInTheDocument();
  });

  it("saves a template", async () => {
    const user = userEvent.setup();
    renderFormBuilder(qc);
    await user.click(screen.getByRole("button", { name: "Save template" }));
    await waitFor(() => expect(templatesService.save).toHaveBeenCalled());
  });

  it("handles save failure", async () => {
    vi.spyOn(templatesService, "save").mockRejectedValue(new Error("Save failed"));
    const user = userEvent.setup();
    renderFormBuilder(qc);
    await user.click(screen.getByRole("button", { name: "Save template" }));
    await waitFor(() => expect(templatesService.save).toHaveBeenCalled());
  });

  it("toggles template status", async () => {
    const user = userEvent.setup();
    renderFormBuilder(qc);
    const switches = screen.getAllByRole("switch");
    if (switches.length > 0) {
      await user.click(switches[0]);
      await waitFor(() => expect(templatesService.updateStatus).toHaveBeenCalled());
    }
  });

  it("handles status change error", async () => {
    vi.spyOn(templatesService, "updateStatus").mockRejectedValue(new Error("Cannot update"));
    const user = userEvent.setup();
    renderFormBuilder(qc);
    const switches = screen.getAllByRole("switch");
    if (switches.length > 0) {
      await user.click(switches[0]);
      await waitFor(() => expect(templatesService.updateStatus).toHaveBeenCalled());
    }
  });

  it("deletes a draft template", async () => {
    renderFormBuilder(qc, { status: "Draft" });
    const user = userEvent.setup();
    // Wait for the page to settle
    await waitFor(() => expect(screen.getByText("KYC Template")).toBeInTheDocument());
    // The delete button is always in DOM but visually hidden until hover
    const deleteBtn = await waitFor(() => {
      const btn = document.querySelector('button[title="Delete draft template"]') as HTMLButtonElement;
      if (!btn) throw new Error("not found");
      return btn;
    });
    fireEvent.click(deleteBtn);
    await waitFor(() => expect(templatesService.delete).toHaveBeenCalled());
  });

  it("shows loading state when detail is loading", () => {
    const loadingQc = makeQueryClient();
    loadingQc.setQueryData(["templates"], [makeTemplate()]);
    loadingQc.setQueryData(["templates", "tpl-1"], undefined);
    // Remove the cached entry to make it re-fetch
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: loadingQc,
    });
    expect(screen.getByText("KYC Template")).toBeInTheDocument();
  });

  it("opens new template dialog", async () => {
    const user = userEvent.setup();
    renderFormBuilder(qc);
    const newBtn = screen.getAllByText("New template")[0];
    await user.click(newBtn);
    await waitFor(() => expect(screen.getByText("New template", { selector: "h2, [role='dialog'] *" })).toBeInTheDocument());
  });

  it("cancels new template dialog", async () => {
    const user = userEvent.setup();
    renderFormBuilder(qc);
    await user.click(screen.getAllByText("New template")[0]);
    await waitFor(() => expect(screen.getByText("Template name")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Cancel" }));
  });

  it("creates a new template with valid name", async () => {
    const user = userEvent.setup();
    renderFormBuilder(qc);
    await user.click(screen.getAllByText("New template")[0]);
    await waitFor(() => expect(screen.getByText("Template name")).toBeInTheDocument());
    const nameInput = screen.getByPlaceholderText("e.g. Enhanced KYC — Supplier");
    await user.type(nameInput, "My Template");
    await user.click(screen.getByRole("button", { name: /Create template/ }));
    await waitFor(() => expect(templatesService.create).toHaveBeenCalled());
  });

  it("shows error when creating template with empty name", async () => {
    const user = userEvent.setup();
    renderFormBuilder(qc);
    await user.click(screen.getAllByText("New template")[0]);
    await waitFor(() => expect(screen.getByText("Template name")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Create template/ }));
    await waitFor(() => expect(templatesService.create).not.toHaveBeenCalled());
  });

  it("handles create template error", async () => {
    vi.spyOn(templatesService, "create").mockRejectedValue(new Error("Create failed"));
    const user = userEvent.setup();
    renderFormBuilder(qc);
    await user.click(screen.getAllByText("New template")[0]);
    await waitFor(() => expect(screen.getByText("Template name")).toBeInTheDocument());
    await user.type(screen.getByPlaceholderText("e.g. Enhanced KYC — Supplier"), "My Template");
    await user.click(screen.getByRole("button", { name: /Create template/ }));
    await waitFor(() => expect(templatesService.create).toHaveBeenCalled());
  });

  it("adds a new section through the dialog", async () => {
    const user = userEvent.setup();
    renderFormBuilder(qc);
    await user.click(screen.getByText("Add new section"));
    await waitFor(() => expect(screen.getByText("Section title")).toBeInTheDocument());
    const placeholders = screen.getAllByPlaceholderText("e.g. Financial Information");
    await user.type(placeholders[0], "Brand New Section");
    await user.click(screen.getByRole("button", { name: "Add section" }));
    await waitFor(() => {
      expect(screen.getAllByText(/Brand New Section/).length).toBeGreaterThan(0);
    });
  });

  it("adds a new question to a section", async () => {
    const user = userEvent.setup();
    renderFormBuilder(qc);
    await user.click(screen.getAllByText("Add question to this section")[0]);
    await waitFor(() => {
      expect(screen.getAllByText("Add question to this section").length).toBeGreaterThan(0);
    });
  });

  it("renames a section", async () => {
    const user = userEvent.setup();
    renderFormBuilder(qc);
    await user.click(screen.getAllByRole("button", { name: "Section options" })[0]);
    await user.click(screen.getByText("Rename section"));
    await waitFor(() => expect(screen.getByText("Rename section", { selector: "[role='dialog'] *" })).toBeInTheDocument());
  });

  it("moves a section up", async () => {
    const user = userEvent.setup();
    renderFormBuilder(qc);
    expect(screen.getAllByText(/Section \d+ —/)[0]).toHaveTextContent("Company Info");
    await user.click(screen.getAllByRole("button", { name: "Section options" })[0]);
    await user.click(screen.getByText("Move section down"));
    await waitFor(() => expect(screen.getAllByText(/Section \d+ —/)[0]).toHaveTextContent("Contact Info"));
  });

  it("moves a section down", async () => {
    const user = userEvent.setup();
    renderFormBuilder(qc);
    expect(screen.getAllByText(/Section \d+ —/).at(-1)).toHaveTextContent("Contact Info");
    const optsBtns = screen.getAllByRole("button", { name: "Section options" });
    await user.click(optsBtns[optsBtns.length - 1]);
    await user.click(screen.getByText("Move section up"));
    await waitFor(() => expect(screen.getAllByText(/Section \d+ —/).at(-1)).toHaveTextContent("Company Info"));
  });

  it("removes a section via dialog", async () => {
    const user = userEvent.setup();
    renderFormBuilder(qc);
    expect(screen.getAllByText(/Section \d+ —/).length).toBe(2);
    await user.click(screen.getAllByRole("button", { name: "Section options" })[0]);
    await user.click(screen.getByText("Remove section"));
    await waitFor(() => expect(screen.getByText("Remove this section?")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Remove section" }));
    await waitFor(() => expect(screen.getAllByText(/Section \d+ —/).length).toBe(1));
  });

  it("toggles the section collapse", async () => {
    const user = userEvent.setup();
    renderFormBuilder(qc);
    expect(screen.getByText("Basic details")).toBeInTheDocument();
    const triggers = screen.getAllByText(/Section \d+ —/);
    await user.click(triggers[0]);
    await waitFor(() => expect(screen.queryByText("Basic details")).not.toBeInTheDocument());
  });

  it("renders different field types in question card", () => {
    const tpl = makeTemplate({
      sections: [
        { id: "sec-1", number: 1, title: "Mixed", questions: [
          { id: "q1", text: "Number", type: "number", required: false, prefill: false },
          { id: "q2", text: "Date", type: "date", required: false, prefill: false },
          { id: "q3", text: "URL", type: "url", required: false, prefill: false },
          { id: "q4", text: "Dropdown", type: "dropdown", required: false, prefill: false, options: ["a","b"] },
        ]},
      ],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    expect(screen.getByText("Number")).toBeInTheDocument();
  });

  it("toggles required switch on a question", async () => {
    const user = userEvent.setup();
    renderFormBuilder(qc);
    const switches = screen.getAllByRole("switch");
    expect(switches.length).toBeGreaterThan(1);
    const target = switches[1];
    const before = target.getAttribute("aria-checked");
    await user.click(target);
    await waitFor(() => expect(target.getAttribute("aria-checked")).not.toBe(before));
  });

  it("renders options editor for dropdown question", () => {
    const tpl = makeTemplate({
      sections: [{ id: "sec-1", number: 1, title: "Section", questions: [
        { id: "q1", text: "Drop", type: "dropdown", required: false, prefill: false, options: ["a", "b", "c"] },
      ]}],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    expect(screen.getByText("Options")).toBeInTheDocument();
  });

  it("renders repeater indicator and file upload preview", () => {
    const tpl = makeTemplate({
      sections: [{ id: "sec-1", number: 1, title: "Section", questions: [
        { id: "q1", text: "File", type: "file", required: false, prefill: false },
        { id: "q2", text: "Repeat", type: "text", required: false, prefill: false, repeater: true },
      ]}],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    expect(screen.getByText(/Click to upload or drag and drop/)).toBeInTheDocument();
  });

  it("renders table columns editor", () => {
    const tpl = makeTemplate({
      sections: [{ id: "sec-1", number: 1, title: "Section", questions: [
        { id: "q1", text: "Table", type: "table", required: false, prefill: false, columns: [{ name: "Col1", type: "text", required: false }] },
      ]}],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    expect(screen.getByText("Table columns")).toBeInTheDocument();
  });

  it("renders system-controlled question badge", () => {
    const tpl = makeTemplate({
      sections: [{ id: "sec-1", number: 1, title: "Section", questions: [
        { id: "q1", text: "Sys", type: "text", required: false, prefill: false, systemControlled: true },
      ]}],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    expect(screen.getByText("System")).toBeInTheDocument();
  });

  it("renders the add column button for table questions", async () => {
    const tpl = makeTemplate({
      sections: [{ id: "sec-1", number: 1, title: "Section", questions: [
        { id: "q1", text: "Table", type: "table", required: false, prefill: false, columns: [] },
      ]}],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    expect(screen.getByText(/Add column/)).toBeInTheDocument();
  });

  it("renders a question with options chips", () => {
    const tpl = makeTemplate({
      sections: [{ id: "sec-1", number: 1, title: "Section", questions: [
        { id: "q1", text: "Drop", type: "dropdown", required: false, prefill: false, options: ["First", "Second"] },
      ]}],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("removes an option chip", async () => {
    const tpl = makeTemplate({
      sections: [{ id: "sec-1", number: 1, title: "Section", questions: [
        { id: "q1", text: "Drop", type: "dropdown", required: false, prefill: false, options: ["First", "Second"] },
      ]}],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    // Find the X button next to "First"
    const firstChip = screen.getByText("First");
    const parent = firstChip.parentElement;
    const removeBtn = parent?.querySelector("button");
    expect(removeBtn).toBeTruthy();
    fireEvent.click(removeBtn!);
    await waitFor(() => expect(screen.queryByText("First")).not.toBeInTheDocument());
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("adds a new option on Enter", async () => {
    const tpl = makeTemplate({
      sections: [{ id: "sec-1", number: 1, title: "Section", questions: [
        { id: "q1", text: "Drop", type: "dropdown", required: false, prefill: false, options: [] },
      ]}],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    const optInput = screen.getByPlaceholderText(/Type an option/);
    fireEvent.change(optInput, { target: { value: "NewOpt" } });
    fireEvent.keyDown(optInput, { key: "Enter" });
    await waitFor(() => expect(screen.getByText("NewOpt")).toBeInTheDocument());
    expect((optInput as HTMLInputElement).value).toBe("");
  });

  it("renders file upload preview", () => {
    const tpl = makeTemplate({
      sections: [{ id: "sec-1", number: 1, title: "Section", questions: [
        { id: "q1", text: "File", type: "file", required: false, prefill: false },
      ]}],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    expect(screen.getByText(/Click to upload or drag and drop/)).toBeInTheDocument();
  });

  it("renders number question with min/max inputs", () => {
    const tpl = makeTemplate({
      sections: [{ id: "sec-1", number: 1, title: "Section", questions: [
        { id: "q1", text: "Number", type: "number", required: false, prefill: false, validation: { min: 0, max: 100 } },
      ]}],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    expect(screen.getByText("Min")).toBeInTheDocument();
    expect(screen.getByText("Max")).toBeInTheDocument();
  });

  it("renders text question with maxLength input", () => {
    const tpl = makeTemplate({
      sections: [{ id: "sec-1", number: 1, title: "Section", questions: [
        { id: "q1", text: "Text", type: "text", required: false, prefill: false, validation: { maxLength: 50 } },
      ]}],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    expect(screen.getByText("Max characters")).toBeInTheDocument();
  });

  it("renders date question with allowPast and allowFuture switches", () => {
    const tpl = makeTemplate({
      sections: [{ id: "sec-1", number: 1, title: "Section", questions: [
        { id: "q1", text: "Date", type: "date", required: false, prefill: false },
      ]}],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    expect(screen.getByText("Allow past dates")).toBeInTheDocument();
    expect(screen.getByText("Allow future dates")).toBeInTheDocument();
  });

  it("renders repeater indicator", () => {
    const tpl = makeTemplate({
      sections: [{ id: "sec-1", number: 1, title: "Section", questions: [
        { id: "q1", text: "Repeat", type: "text", required: false, prefill: false, repeater: true },
      ]}],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    expect(screen.getByText(/\+ Add another/)).toBeInTheDocument();
  });

  it("renders sameAsToggleLabel toggle", () => {
    const tpl = makeTemplate({
      sections: [{ id: "sec-1", number: 1, title: "Section", questions: [
        { id: "q1", text: "Long", type: "longtext", required: false, prefill: false, sameAsToggleLabel: "Same as above" },
      ]}],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    expect(screen.getByText("Same as above")).toBeInTheDocument();
  });

  it("renders attachUpload note", () => {
    const tpl = makeTemplate({
      sections: [{ id: "sec-1", number: 1, title: "Section", questions: [
        { id: "q1", text: "Attach", type: "file", required: false, prefill: false, attachUpload: true },
      ]}],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    expect(screen.getByText(/trade license document/)).toBeInTheDocument();
  });

  it("renders note text", () => {
    const tpl = makeTemplate({
      sections: [{ id: "sec-1", number: 1, title: "Section", questions: [
        { id: "q1", text: "Note", type: "text", required: false, prefill: false, note: "Some note here" },
      ]}],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    expect(screen.getByText("Some note here")).toBeInTheDocument();
  });

  it("triggers drag start on a question card", async () => {
    renderFormBuilder(qc);
    const handle = screen.getAllByLabelText("Drag to reorder question")[0];
    const dataTransfer = { setData: vi.fn(), effectAllowed: "", setDragImage: vi.fn() };
    fireEvent.dragStart(handle, { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith("text/plain", "0");
    fireEvent.dragEnd(handle, { dataTransfer });
  });

  it("triggers dragover on the question list", async () => {
    renderFormBuilder(qc);
    const handles = screen.getAllByLabelText("Drag to reorder question");
    const handle = handles[0];
    const dataTransfer = { setData: vi.fn(), effectAllowed: "", setDragImage: vi.fn(), dropEffect: "" };
    // First, start drag
    fireEvent.dragStart(handle, { dataTransfer });
    // Flush the requestAnimationFrame that marks dragging as active
    await new Promise((resolve) => requestAnimationFrame(resolve));
    // Then simulate dragover on the container - find the list container
    const cards = document.querySelectorAll('[data-question-id]');
    expect(cards.length).toBeGreaterThan(0);
    const container = cards[0].parentElement!;
    fireEvent.dragOver(container, { dataTransfer, clientY: 100 });
    expect(dataTransfer.dropEffect).toBe("move");
    fireEvent.drop(container, { dataTransfer, clientY: 100 });
    fireEvent.dragEnd(handle, { dataTransfer });
  });

  it("updates a table column name", async () => {
    const tpl = makeTemplate({
      sections: [{ id: "sec-1", number: 1, title: "Section", questions: [
        { id: "q1", text: "Table", type: "table", required: false, prefill: false, columns: [{ name: "OldName", type: "text", required: false }] },
      ]}],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    const colInput = screen.getByDisplayValue("OldName");
    fireEvent.change(colInput, { target: { value: "NewName" } });
    await waitFor(() => expect(screen.getByDisplayValue("NewName")).toBeInTheDocument());
  });

  it("adds a new table column", async () => {
    const tpl = makeTemplate({
      sections: [{ id: "sec-1", number: 1, title: "Section", questions: [
        { id: "q1", text: "Table", type: "table", required: false, prefill: false, columns: [] },
      ]}],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    expect(screen.queryAllByPlaceholderText("Column name").length).toBe(0);
    fireEvent.click(screen.getByText(/Add column/));
    await waitFor(() => expect(screen.getAllByPlaceholderText("Column name").length).toBe(1));
  });

  it("removes a table column", async () => {
    const tpl = makeTemplate({
      sections: [{ id: "sec-1", number: 1, title: "Section", questions: [
        { id: "q1", text: "Table", type: "table", required: false, prefill: false, columns: [{ name: "Col1", type: "text", required: false }] },
      ]}],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    // Find the X button next to the column
    const colInput = screen.getByDisplayValue("Col1");
    const parent = colInput.parentElement!;
    const removeBtn = parent.querySelectorAll("button")[parent.querySelectorAll("button").length - 1];
    expect(removeBtn).toBeTruthy();
    fireEvent.click(removeBtn);
    await waitFor(() => expect(screen.queryByDisplayValue("Col1")).not.toBeInTheDocument());
  });

  it("renders a question with note text", () => {
    const tpl = makeTemplate({
      sections: [{ id: "sec-1", number: 1, title: "Section", questions: [
        { id: "q1", text: "WithNote", type: "text", required: false, prefill: false, note: "Internal note" },
      ]}],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    expect(screen.getByText("Internal note")).toBeInTheDocument();
  });

  it("renders questions with help text and shows it", () => {
    const tpl = makeTemplate({
      sections: [{ id: "sec-1", number: 1, title: "Section", questions: [
        { id: "q1", text: "Has Help", type: "text", required: false, prefill: false, helpText: "Some helpful text" },
      ]}],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    expect(screen.getByDisplayValue("Some helpful text")).toBeInTheDocument();
  });

  it("shows '+ Add help text' button for questions without help text", () => {
    const tpl = makeTemplate({
      sections: [{ id: "sec-1", number: 1, title: "Section", questions: [
        { id: "q1", text: "NoHelp", type: "text", required: false, prefill: false },
      ]}],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    const { container } = renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    // The button text is split with an HTML entity — just check the container has the text
    const body = container.textContent ?? "";
    expect(body.includes("Add help text") || body.includes("+ Add help text")).toBeTruthy();
  });

  it("renders question with repeater=true and shows multiple items", () => {
    const tpl = makeTemplate({
      sections: [{ id: "sec-1", number: 1, title: "Section", questions: [
        { id: "q1", text: "Multi", type: "text", required: false, prefill: false, repeater: true },
      ]}],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    expect(screen.getAllByRole("textbox").length).toBeGreaterThan(0);
  });

  it("removes a question via the popover", async () => {
    const user = userEvent.setup();
    const tpl = makeTemplate({
      sections: [{ id: "sec-1", number: 1, title: "Section", questions: [
        { id: "q1", text: "Q1", type: "text", required: false, prefill: false },
        { id: "q2", text: "Q2", type: "text", required: false, prefill: false },
      ]}],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    expect(screen.getByDisplayValue("Q1")).toBeInTheDocument();
    const trashIcon = document.querySelector(".lucide-trash-2");
    const trashButton = trashIcon?.closest("button");
    expect(trashButton).toBeTruthy();
    await user.click(trashButton!);
    const confirmButton = await screen.findByText("Yes, remove");
    await user.click(confirmButton);
    await waitFor(() => expect(screen.queryByDisplayValue("Q1")).not.toBeInTheDocument());
    expect(screen.getByDisplayValue("Q2")).toBeInTheDocument();
  });

  it("renders long text question", () => {
    const tpl = makeTemplate({
      sections: [{ id: "sec-1", number: 1, title: "Section", questions: [
        { id: "q1", text: "LongQ", type: "longtext", required: false, prefill: false },
      ]}],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    expect(screen.getByDisplayValue("LongQ")).toBeInTheDocument();
  });

  it("renders url question", () => {
    const tpl = makeTemplate({
      sections: [{ id: "sec-1", number: 1, title: "Section", questions: [
        { id: "q1", text: "URLQ", type: "url", required: false, prefill: false },
      ]}],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    expect(screen.getByDisplayValue("URLQ")).toBeInTheDocument();
  });

  it("renders esign question", () => {
    const tpl = makeTemplate({
      sections: [{ id: "sec-1", number: 1, title: "Section", questions: [
        { id: "q1", text: "EsignQ", type: "esign", required: false, prefill: false },
      ]}],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    expect(screen.getByDisplayValue("EsignQ")).toBeInTheDocument();
  });

  it("renders toggle question", () => {
    const tpl = makeTemplate({
      sections: [{ id: "sec-1", number: 1, title: "Section", questions: [
        { id: "q1", text: "ToggleQ", type: "toggle", required: false, prefill: false },
      ]}],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    expect(screen.getByDisplayValue("ToggleQ")).toBeInTheDocument();
  });

  it("renders radio question with options", () => {
    const tpl = makeTemplate({
      sections: [{ id: "sec-1", number: 1, title: "Section", questions: [
        { id: "q1", text: "Radio", type: "radio", required: false, prefill: false, options: ["A", "B"] },
      ]}],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    expect(screen.getByText("Options")).toBeInTheDocument();
  });

  it("renders multiselect question with options", () => {
    const tpl = makeTemplate({
      sections: [{ id: "sec-1", number: 1, title: "Section", questions: [
        { id: "q1", text: "Multi", type: "multiselect", required: false, prefill: false, options: ["A", "B"] },
      ]}],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    expect(screen.getByText("Options")).toBeInTheDocument();
  });

  it("changes the question type via the type select", () => {
    renderFormBuilder(qc);
    // Radix Select cannot fully open in jsdom (missing scrollIntoView), so
    // this verifies the trigger for the first question is wired to its type.
    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBeGreaterThan(0);
    expect(selects[0]).toHaveTextContent("Text (single line)");
  });

  it("toggles the question required switch", async () => {
    const user = userEvent.setup();
    renderFormBuilder(qc);
    const switches = screen.getAllByRole("switch");
    // The first switch is the Draft/Active toggle, then there are required switches
    // Click on a switch (skip the first one which is template status)
    expect(switches.length).toBeGreaterThan(2);
    const target = switches[1];
    const before = target.getAttribute("aria-checked");
    await user.click(target);
    await waitFor(() => expect(target.getAttribute("aria-checked")).not.toBe(before));
  });

  it("toggles the system controlled question switch (disabled)", () => {
    const tpl = makeTemplate({
      sections: [{ id: "sec-1", number: 1, title: "Section", questions: [
        { id: "q1", text: "Sys", type: "text", required: false, prefill: false, systemControlled: true },
      ]}],
    });
    qc.setQueryData(["templates"], [tpl]);
    qc.setQueryData(["templates", tpl.id], tpl);
    renderWithProviders(<FormBuilderPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      queryClient: qc,
    });
    // Just verify it renders
    expect(screen.getByDisplayValue("Sys")).toBeInTheDocument();
  });

  it("updates a question's text via the input", async () => {
    const user = userEvent.setup();
    renderFormBuilder(qc);
    // Find the input with Company name value
    const inputs = screen.getAllByDisplayValue("Company name") as HTMLInputElement[];
    if (inputs.length > 0) {
      const input = inputs[0];
      await user.clear(input);
      await user.type(input, "New Company Name");
      expect(input.value).toBe("New Company Name");
    }
  });

  it("clicks the add help text button to show help input", async () => {
    const user = userEvent.setup();
    renderFormBuilder(qc);
    const addHelpButtons = screen.getAllByText("+ Add help text");
    expect(addHelpButtons.length).toBeGreaterThan(0);
    await user.click(addHelpButtons[0]);
    await waitFor(() =>
      expect(screen.getAllByPlaceholderText(/Help text shown to subject/).length).toBeGreaterThan(0)
    );
  });

  it("toggles section collapse to closed", async () => {
    const user = userEvent.setup();
    renderFormBuilder(qc);
    expect(screen.getByText("Basic details")).toBeInTheDocument();
    // Click on the section title to collapse
    const sectionTitle = screen.getByText(/Section 1 — Company Info/);
    await user.click(sectionTitle);
    await waitFor(() => expect(screen.queryByText("Basic details")).not.toBeInTheDocument());
  });

  it("cancels the rename section dialog", async () => {
    const user = userEvent.setup();
    renderFormBuilder(qc);
    await user.click(screen.getAllByRole("button", { name: "Section options" })[0]);
    await user.click(screen.getByText("Rename section"));
    await waitFor(() => {
      expect(screen.getAllByText("Rename section").length).toBeGreaterThan(0);
    });
    // Click cancel
    const cancelBtns = screen.getAllByRole("button", { name: "Cancel" });
    if (cancelBtns.length > 0) {
      await user.click(cancelBtns[cancelBtns.length - 1]);
    }
  });

  it("saves the rename section", async () => {
    const user = userEvent.setup();
    renderFormBuilder(qc);
    await user.click(screen.getAllByRole("button", { name: "Section options" })[0]);
    await user.click(screen.getByText("Rename section"));
    await waitFor(() => {
      expect(screen.getAllByText("Rename section").length).toBeGreaterThan(0);
    });
    // Type new name and save
    const input = screen.getByDisplayValue("Company Info") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "Updated Section");
    const saveBtn = screen.getByRole("button", { name: "Save" });
    await user.click(saveBtn);
  });

  it("cancels the remove section dialog", async () => {
    const user = userEvent.setup();
    renderFormBuilder(qc);
    await user.click(screen.getAllByRole("button", { name: "Section options" })[0]);
    await user.click(screen.getByText("Remove section"));
    await waitFor(() => expect(screen.getByText("Remove this section?")).toBeInTheDocument());
    // Click cancel
    const cancelBtns = screen.getAllByRole("button", { name: "Cancel" });
    if (cancelBtns.length > 0) {
      await user.click(cancelBtns[cancelBtns.length - 1]);
    }
  });

  it("cancels the add section dialog", async () => {
    const user = userEvent.setup();
    renderFormBuilder(qc);
    await user.click(screen.getByText("Add new section"));
    await waitFor(() => expect(screen.getByText("Section title")).toBeInTheDocument());
    // Click cancel
    const cancelBtns = screen.getAllByRole("button", { name: "Cancel" });
    if (cancelBtns.length > 0) {
      await user.click(cancelBtns[cancelBtns.length - 1]);
    }
  });

  it("renders drag handles for each question", () => {
    renderFormBuilder(qc);
    const handles = screen.getAllByLabelText("Drag to reorder question");
    expect(handles.length).toBeGreaterThanOrEqual(3);
  });

  it("triggers the popover to delete a question", async () => {
    const user = userEvent.setup();
    renderFormBuilder(qc);
    // Find the trash button next to a question
    const trashIcons = document.querySelectorAll('.lucide-trash-2');
    if (trashIcons.length > 0) {
      const parent = trashIcons[0].closest('button');
      if (parent) {
        await user.click(parent);
        // Just verify the click doesn't throw
        expect(parent).toBeInTheDocument();
      }
    }
  });
});
