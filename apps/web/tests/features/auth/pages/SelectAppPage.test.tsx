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

  it("renders feature list items for each app", () => {
    renderWithProviders(<SelectAppPage />, { routerPath: "/select-app" });
    expect(screen.getByText("Automated checks")).toBeInTheDocument();
    expect(screen.getByText("Issue tracking")).toBeInTheDocument();
    expect(screen.getByText("Audit trail")).toBeInTheDocument();
    expect(screen.getByText("Custom forms")).toBeInTheDocument();
    expect(screen.getByText("Reviewer assignment")).toBeInTheDocument();
    expect(screen.getByText("Scoring & insights")).toBeInTheDocument();
  });

  it("renders the Cedar Rose header logo", () => {
    renderWithProviders(<SelectAppPage />, { routerPath: "/select-app" });
    expect(screen.getAllByText("Cedar Rose").length).toBeGreaterThan(0);
  });

  it("renders user initials in the avatar", () => {
    renderWithProviders(<SelectAppPage />, {
      authValue: { user: { id: "u1", name: "Alice Bob", email: "a@b.com", role: "analyst", title: "T", initials: "AB" } },
      routerPath: "/select-app",
    });
    expect(screen.getByText("AB")).toBeInTheDocument();
  });

  it("falls back to derived initials from name when initials is missing", () => {
    renderWithProviders(<SelectAppPage />, {
      authValue: {
        user: {
          id: "u1",
          name: "Charlie Delta",
          email: "c@d.com",
          role: "analyst",
          title: "T",
          initials: undefined,
        } as unknown as import("@/types").CurrentUser,
      },
      routerPath: "/select-app",
    });
    expect(screen.getByText("CH")).toBeInTheDocument();
  });

  it("falls back to User when no user is present", () => {
    renderWithProviders(<SelectAppPage />, { routerPath: "/select-app" });
    expect(screen.getByText("User")).toBeInTheDocument();
  });

  it("renders the description for each app card", () => {
    renderWithProviders(<SelectAppPage />, { routerPath: "/select-app" });
    expect(screen.getByText(/Automated quality assurance workflows/)).toBeInTheDocument();
    expect(screen.getByText(/Structured questionnaires and reviewer workflows/)).toBeInTheDocument();
  });

  it("greeting changes for morning (hour < 12)", () => {
    const mockDate = new Date(2026, 5, 1, 9, 0, 0); // 9 AM
    vi.setSystemTime(mockDate);
    renderWithProviders(<SelectAppPage />, { routerPath: "/select-app" });
    expect(screen.getByText(/Good morning/)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("greeting changes for afternoon (12 <= hour < 18)", () => {
    const mockDate = new Date(2026, 5, 1, 14, 0, 0); // 2 PM
    vi.setSystemTime(mockDate);
    renderWithProviders(<SelectAppPage />, { routerPath: "/select-app" });
    expect(screen.getByText(/Good afternoon/)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("greeting changes for evening (hour >= 18)", () => {
    const mockDate = new Date(2026, 5, 1, 20, 0, 0); // 8 PM
    vi.setSystemTime(mockDate);
    renderWithProviders(<SelectAppPage />, { routerPath: "/select-app" });
    expect(screen.getByText(/Good evening/)).toBeInTheDocument();
    vi.useRealTimers();
  });
});
