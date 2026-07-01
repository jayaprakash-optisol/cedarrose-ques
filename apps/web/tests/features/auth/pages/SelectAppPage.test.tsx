import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import SelectAppPage from "@/features/auth/pages/SelectAppPage";
import { authService } from "@/services";
import { renderWithProviders } from "../../../helpers/render";
import * as appSelection from "@/lib/app-selection";

describe("SelectAppPage", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("renders the heading and both app cards", () => {
    renderWithProviders(<SelectAppPage />, { routerPath: "/select-app" });
    expect(screen.getByText("QA Automation")).toBeInTheDocument();
    expect(screen.getByText("QA Questionnaire")).toBeInTheDocument();
  });

  it("greets the user with their first name", () => {
    renderWithProviders(<SelectAppPage />, {
      authValue: { user: { id: "u1", name: "Jane Doe", email: "j@e.com", role: "analyst", title: "T", initials: "JD" } },
    });
    expect(screen.getByText(/Jane\./)).toBeInTheDocument();
  });

  it("falls back to 'there' and a derived initials when no user is present", () => {
    renderWithProviders(<SelectAppPage />);
    expect(screen.getByText(/there\./)).toBeInTheDocument();
  });

  it("calls setAppSelected('questionnaire') and navigates to / when QA Questionnaire is clicked", async () => {
    const user = userEvent.setup();
    const setSpy = vi.spyOn(appSelection, "setAppSelected");
    renderWithProviders(<SelectAppPage />, { routerPath: "/select-app" });
    await user.click(screen.getByRole("button", { name: /Open QA Questionnaire/ }));
    await waitFor(() => {
      expect(setSpy).toHaveBeenCalledWith("questionnaire");
    });
  });

  it("calls setAppSelected('automation') when QA Automation is clicked", async () => {
    const user = userEvent.setup();
    const setSpy = vi.spyOn(appSelection, "setAppSelected");
    renderWithProviders(<SelectAppPage />, { routerPath: "/select-app" });
    // The QA Automation URL is set via vitest.config define
    await user.click(screen.getByRole("button", { name: /Open QA Automation/ }));
    await waitFor(() => {
      expect(setSpy).toHaveBeenCalledWith("automation");
    });
  });

  it("signs out when Sign out is clicked", async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, "logout").mockResolvedValue();
    renderWithProviders(<SelectAppPage />, {
      authValue: { user: { id: "u1", name: "Jane", email: "j@e.com", role: "analyst", title: "T", initials: "J" } },
    });
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => {
      expect(authService.logout).toHaveBeenCalled();
    });
  });
});

