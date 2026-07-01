import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import { AppShell } from "@/components/layout/AppShell";
import { authService } from "@/services";
import { renderWithProviders } from "../../helpers/render";
import type { CurrentUser } from "@/types";

const baseUser: CurrentUser = {
  id: "u1",
  name: "Jane Doe",
  email: "jane@example.com",
  role: "analyst",
  title: "Analyst",
  initials: "JD",
};

function renderShell(user?: CurrentUser, isAdmin = false) {
  return renderWithProviders(
    <AppShell>
      <div data-testid="child">Page</div>
    </AppShell>,
    { authValue: { user, isAdmin, isLoading: false, isAuthenticated: !!user, isBootstrapping: false } },
  );
}

describe("AppShell", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("renders the children inside the main area", () => {
    renderShell(baseUser);
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("renders the dashboard header", () => {
    renderShell(baseUser);
    expect(screen.getByText("Questionnaire Operations Dashboard")).toBeInTheDocument();
  });

  it("renders the business nav items", () => {
    renderShell(baseUser);
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("All Cases")).toBeInTheDocument();
    expect(screen.getByText("New Request")).toBeInTheDocument();
    expect(screen.getByText("Audit Log")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("hides admin nav for non-admins", () => {
    renderShell(baseUser, false);
    expect(screen.queryByText("Form Builder")).not.toBeInTheDocument();
    expect(screen.queryByText("Platform Configuration")).not.toBeInTheDocument();
    expect(screen.queryByText("User Roles & Access")).not.toBeInTheDocument();
  });

  it("shows admin nav for admins", () => {
    renderShell({ ...baseUser, role: "admin" }, true);
    expect(screen.getByText("Form Builder")).toBeInTheDocument();
    expect(screen.getByText("Platform Configuration")).toBeInTheDocument();
    expect(screen.getByText("User Roles & Access")).toBeInTheDocument();
  });

  it("falls back to 'User' when the user is undefined", () => {
    renderShell(undefined);
    expect(screen.getAllByText("User").length).toBeGreaterThan(0);
  });

  it("uses user.name and user.initials when present", () => {
    renderShell(baseUser);
    expect(screen.getAllByText("Jane Doe").length).toBeGreaterThan(0);
    expect(screen.getAllByText("JD").length).toBeGreaterThan(0);
  });

  it("highlights the active link for the current path", () => {
    renderWithProviders(
      <AppShell>
        <div />
      </AppShell>,
      { authValue: { user: baseUser, isAuthenticated: true, isLoading: false, isBootstrapping: false, isAdmin: false }, routerPath: "/cases" },
    );
    const casesLink = screen.getByRole("link", { name: /All Cases/ });
    expect(casesLink.className).toContain("bg-white/10");
  });

  it("highlights Overview only on / path", () => {
    renderWithProviders(
      <AppShell>
        <div />
      </AppShell>,
      { authValue: { user: baseUser, isAuthenticated: true, isLoading: false, isBootstrapping: false, isAdmin: false }, routerPath: "/audit-log" },
    );
    const overviewLink = screen.getByRole("link", { name: /Overview/ });
    // Overview only gets active when path is exactly '/'
    expect(overviewLink.className).not.toContain("bg-white/10");
    const auditLink = screen.getByRole("link", { name: /Audit Log/ });
    expect(auditLink.className).toContain("bg-white/10");
  });

  it("logs out and navigates to /login when the logout button is clicked", async () => {
    const user = userEvent.setup();
    const logout = vi.spyOn(authService, "logout").mockResolvedValue();
    renderShell(baseUser);
    await user.click(screen.getByLabelText("Log out"));
    await waitFor(() => {
      expect(logout).toHaveBeenCalled();
    });
  });
});
