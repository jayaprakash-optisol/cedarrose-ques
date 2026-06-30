import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FormBuilderPage from "@/features/admin/form-builder/pages/FormBuilderPage";
import { renderWithRouter } from "../../../../helpers/render-with-router";

vi.mock("@/components/layout/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

async function waitForBuilder() {
  await waitFor(() => {
    expect(screen.getByRole("button", { name: /save template/i })).toBeInTheDocument();
  }, { timeout: 15000 });
}

describe("FormBuilderPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads template library", async () => {
    renderWithRouter(<FormBuilderPage />);
    await waitFor(() => {
      expect(screen.getByText(/form builder/i)).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /questionnaire templates/i })).toBeInTheDocument();
    });
  });

  it("creates a new template", async () => {
    const user = userEvent.setup();
    renderWithRouter(<FormBuilderPage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /new template/i })).toBeEnabled();
    });

    await user.click(screen.getByRole("button", { name: /new template/i }));
    await user.type(screen.getByPlaceholderText(/enhanced kyc/i), "Test Template");
    await user.click(screen.getByRole("button", { name: /create template/i }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("Test Template")).toBeInTheDocument();
    });
  });

  it("shows error when creating template without name", async () => {
    const user = userEvent.setup();
    renderWithRouter(<FormBuilderPage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /new template/i })).toBeEnabled();
    });

    await user.click(screen.getByRole("button", { name: /new template/i }));
    await user.click(screen.getByRole("button", { name: /create template/i }));

    const { toast } = await import("sonner");
    expect(toast.error).toHaveBeenCalledWith("Template name is required");
  });

  it("cancels new template dialog", async () => {
    const user = userEvent.setup();
    renderWithRouter(<FormBuilderPage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /new template/i })).toBeEnabled();
    });

    await user.click(screen.getByRole("button", { name: /new template/i }));
    await user.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("saves template after adding a section", async () => {
    const user = userEvent.setup();
    renderWithRouter(<FormBuilderPage />);
    await waitForBuilder();

    await user.click(screen.getByRole("button", { name: /add new section/i }));
    await user.click(screen.getByRole("button", { name: /^add section$/i }));
    await user.click(screen.getByRole("button", { name: /save template/i }));

    const { toast } = await import("sonner");
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it("switches selected template in library", async () => {
    const user = userEvent.setup();
    renderWithRouter(<FormBuilderPage />);

    await waitFor(() => {
      expect(screen.getByText(/standard due diligence — customer/i)).toBeInTheDocument();
    }, { timeout: 10000 });

    await user.click(screen.getByText(/standard due diligence — customer/i));
    await waitFor(() => {
      expect(screen.getByDisplayValue(/customer/i)).toBeInTheDocument();
    });
  });

  it("renders loaded template question types including table and date", async () => {
    renderWithRouter(<FormBuilderPage />);
    await waitForBuilder();

    expect(screen.getByDisplayValue(/full legal name/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/premises type/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/premises size/i)).toBeInTheDocument();
    expect(screen.getAllByText(/repeating row table/i).length).toBeGreaterThan(0);
  });

  it("adds a question to a section", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithRouter(<FormBuilderPage />);
    await waitForBuilder();

    const beforeCount = screen.getAllByPlaceholderText(/question label/i).length;
    await user.click(screen.getAllByRole("button", { name: /add question to this section/i })[0]);
    expect(screen.getAllByPlaceholderText(/question label/i).length).toBe(beforeCount + 1);
  }, 15000);

  it("changes question type to dropdown and adds an option", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithRouter(<FormBuilderPage />);
    await waitForBuilder();

    await user.click(screen.getAllByRole("button", { name: /add question to this section/i })[0]);

    const typeTrigger = screen.getAllByRole("combobox").at(-1)!;
    await user.click(typeTrigger);
    await user.click(await screen.findByRole("option", { name: /dropdown \(single select\)/i }));

    const optInputs = screen.getAllByPlaceholderText(/type an option and press enter/i);
    await user.type(optInputs[optInputs.length - 1], "Option A{Enter}");
    expect(screen.getAllByText("Option A").length).toBeGreaterThan(0);
  }, 15000);

  it("toggles template active status", async () => {
    const user = userEvent.setup();
    renderWithRouter(<FormBuilderPage />);
    await waitForBuilder();

    const statusSwitch = screen.getAllByRole("switch").find((sw) => {
      const parent = sw.closest(".flex.items-center.gap-2");
      return parent?.textContent?.includes("Active");
    });
    expect(statusSwitch).toBeTruthy();
    await user.click(statusSwitch!);

    const { toast } = await import("sonner");
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it("manages sections via dropdown menu", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithRouter(<FormBuilderPage />);
    await waitForBuilder();

    await user.click(screen.getByRole("button", { name: /add new section/i }));
    await user.type(screen.getByPlaceholderText(/financial information/i), "Finance");
    await user.click(screen.getByRole("button", { name: /^add section$/i }));

    const sectionMenus = screen.getAllByRole("button", { name: /section options/i });
    const targetMenu = sectionMenus[sectionMenus.length - 1];
    await user.click(targetMenu);
    await user.click(await screen.findByRole("menuitem", { name: /rename section/i }));
    const renameInput = within(screen.getByRole("dialog")).getByRole("textbox");
    await user.clear(renameInput);
    await user.type(renameInput, "Financials");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(screen.getByText(/financials/i)).toBeInTheDocument();
    });

    await user.click(targetMenu);
    await user.click(await screen.findByRole("menuitem", { name: /move section down/i }));
  });

  it("deletes draft template from library", async () => {
    const user = userEvent.setup();
    renderWithRouter(<FormBuilderPage />);

    await waitFor(() => {
      expect(screen.getByText(/enhanced kyc — partner/i)).toBeInTheDocument();
    }, { timeout: 10000 });

    await user.click(screen.getByText(/enhanced kyc — partner/i));
    await waitForBuilder();

    const deleteButtons = screen.getAllByTitle("Delete draft template");
    await user.click(deleteButtons[deleteButtons.length - 1]);

    const { toast } = await import("sonner");
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it("collapses and expands a section", async () => {
    const user = userEvent.setup();
    renderWithRouter(<FormBuilderPage />);
    await waitForBuilder();

    const triggers = screen.getAllByRole("button").filter((btn) =>
      btn.textContent?.includes("Section 1"),
    );
    await user.click(triggers[0]);
    await user.click(triggers[0]);
  });
});
