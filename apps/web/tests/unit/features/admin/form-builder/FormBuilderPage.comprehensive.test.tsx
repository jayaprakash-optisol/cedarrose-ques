import { describe, it, expect, vi, beforeEach } from "vitest";
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

describe("FormBuilderPage comprehensive", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows save error when templatesService.create fails", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    vi.spyOn(services.templatesService, "create").mockRejectedValueOnce(new Error("fail"));
    const { toast } = await import("sonner");

    renderWithRouter(<FormBuilderPage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /new template/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /new template/i }));
    await user.type(screen.getByPlaceholderText(/enhanced kyc/i), "Error Template");
    await user.click(screen.getByRole("button", { name: /create template/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  }, 30000);

  it("shows error when templatesService.updateStatus fails", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    vi.spyOn(services.templatesService, "updateStatus").mockRejectedValueOnce(new Error("fail"));
    const { toast } = await import("sonner");

    renderWithRouter(<FormBuilderPage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save template/i })).toBeInTheDocument();
    }, { timeout: 15000 });

    const statusSwitch = screen.getAllByRole("switch")[0];
    await user.click(statusSwitch);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  }, 30000);
});
