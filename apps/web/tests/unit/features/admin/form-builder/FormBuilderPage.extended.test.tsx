import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FormBuilderPage from "@/features/admin/form-builder/pages/FormBuilderPage";
import { renderWithRouter } from "../../../../helpers/render-with-router";
import * as services from "@/services";

vi.mock("@/components/layout/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

async function waitForBuilder() {
  await waitFor(
    () => {
      expect(screen.getByRole("button", { name: /save template/i })).toBeInTheDocument();
    },
    { timeout: 15000 },
  );
}

describe("FormBuilderPage extended interactions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("manages table columns on shareholder section", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithRouter(<FormBuilderPage />);
    await waitForBuilder();

    expect(screen.getAllByText(/repeating row table/i).length).toBeGreaterThan(0);
    const addColButtons = screen.getAllByRole("button", { name: /add column/i });
    if (addColButtons.length > 0) {
      await user.click(addColButtons[0]);
      const colInputs = screen.getAllByPlaceholderText(/column name/i);
      await user.type(colInputs[colInputs.length - 1], "Ownership");
    }
  }, 20000);

  it("toggles validation spinbuttons on loaded template", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithRouter(<FormBuilderPage />);
    await waitForBuilder();

    const spinners = screen.getAllByRole("spinbutton");
    if (spinners.length > 0) {
      await user.clear(spinners[0]);
      await user.type(spinners[0], "5");
    }
  }, 20000);

  it("shows toast errors when template operations fail", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    vi.spyOn(services.templatesService, "create").mockRejectedValueOnce(new Error("create failed"));

    renderWithRouter(<FormBuilderPage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /new template/i })).toBeEnabled();
    });

    await user.click(screen.getByRole("button", { name: /new template/i }));
    await user.type(screen.getByPlaceholderText(/enhanced kyc/i), "Fail Template");
    await user.click(screen.getByRole("button", { name: /create template/i }));

    const { toast } = await import("sonner");
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  }, 20000);

  it("deletes a question, removes section, and adds help text", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithRouter(<FormBuilderPage />);
    await waitForBuilder();

    await user.click(screen.getAllByRole("button", { name: /add question to this section/i })[0]);
    const addHelp = screen.queryAllByText(/\+ add help text/i)[0];
    if (addHelp) {
      await user.click(addHelp);
      const helpInputs = screen.getAllByPlaceholderText(/help text shown to subject/i);
      await user.type(helpInputs[helpInputs.length - 1], "Extra guidance");
    }

    const trashButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn.querySelector("svg.lucide-trash2") && !btn.title?.includes("Delete draft"));
    if (trashButtons.length > 0) {
      await user.click(trashButtons[trashButtons.length - 1]);
      await user.click(screen.getByText(/yes, remove/i));
    }

    await user.click(screen.getByRole("button", { name: /add new section/i }));
    await user.type(screen.getByPlaceholderText(/financial information/i), "Temp Section");
    await user.click(screen.getByRole("button", { name: /^add section$/i }));

    const menus = screen.getAllByRole("button", { name: /section options/i });
    await user.click(menus[menus.length - 1]);
    await user.click(await screen.findByRole("menuitem", { name: /remove section/i }));
    await user.click(screen.getByRole("button", { name: /remove section/i }));
  }, 30000);

  it("configures number, date, table, and dropdown question settings", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithRouter(<FormBuilderPage />);
    await waitForBuilder();

    const minInputs = screen
      .getAllByRole("spinbutton")
      .filter((el) => el.closest(".pl-6")?.textContent?.includes("Min"));
    if (minInputs.length > 0) {
      await user.clear(minInputs[0]);
      await user.type(minInputs[0], "1");
    }

    const dateSwitches = screen.getAllByRole("switch").filter((sw) => {
      const label = sw.parentElement?.textContent ?? "";
      return label.includes("Allow past dates") || label.includes("Allow future dates");
    });
    for (const sw of dateSwitches.slice(0, 2)) {
      await user.click(sw);
    }

    const removeOptButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn.querySelector("svg.lucide-x") && btn.closest(".inline-flex.items-center.gap-1"));
    if (removeOptButtons.length > 0) {
      await user.click(removeOptButtons[0]);
    }

    const colDeleteButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn.querySelector("svg.lucide-x") && btn.closest(".flex.items-center.gap-2"));
    if (colDeleteButtons.length > 0) {
      await user.click(colDeleteButtons[colDeleteButtons.length - 1]);
    }

    const addColButtons = screen.queryAllByRole("button", { name: /add column/i });
    if (addColButtons.length > 0) {
      await user.click(addColButtons[0]);
    }

    await user.click(screen.getAllByRole("button", { name: /add question to this section/i })[0]);
    const typeTrigger = screen.getAllByRole("combobox").at(-1)!;
    await user.click(typeTrigger);
    await user.click(await screen.findByRole("option", { name: /file upload/i }));
    expect(screen.getAllByText(/file upload/i).length).toBeGreaterThan(0);
  }, 30000);

  it("shows error when save fails", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    vi.spyOn(services.templatesService, "save").mockRejectedValueOnce(new Error("save failed"));
    const { toast } = await import("sonner");

    renderWithRouter(<FormBuilderPage />);
    await waitForBuilder();
    await user.click(screen.getByRole("button", { name: /save template/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  }, 20000);

  it("toggles question required switch and max length validation", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithRouter(<FormBuilderPage />);
    await waitForBuilder();

    const requiredLabels = screen.getAllByText("Required");
    const reqSwitch = requiredLabels[0].parentElement?.querySelector('[role="switch"]');
    if (reqSwitch) await user.click(reqSwitch as Element);

    const maxLenInputs = screen
      .getAllByRole("spinbutton")
      .filter((el) => el.closest(".pl-6")?.textContent?.includes("Max characters"));
    if (maxLenInputs.length > 0) {
      await user.clear(maxLenInputs[0]);
      await user.type(maxLenInputs[0], "100");
    }
  }, 20000);

  it("cycles through all question field types", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithRouter(<FormBuilderPage />);
    await waitForBuilder();

    await user.click(screen.getAllByRole("button", { name: /add question to this section/i })[0]);
    const typeLabels = [
      /text \(single line\)/i,
      /long text \(paragraph\)/i,
      /number/i,
      /date picker/i,
      /dropdown \(single select\)/i,
      /multiple choice \(radio\)/i,
      /multi-select \(checkbox group\)/i,
      /file upload/i,
      /dynamic table \(row repeater\)/i,
      /e-signature/i,
      /toggle \(yes\/no\)/i,
      /url/i,
      /document upload/i,
    ];

    for (const label of typeLabels) {
      const typeTrigger = screen.getAllByRole("combobox").at(-1)!;
      await user.click(typeTrigger);
      await user.click(await screen.findByRole("option", { name: label }));
    }
  }, 120000);
});
