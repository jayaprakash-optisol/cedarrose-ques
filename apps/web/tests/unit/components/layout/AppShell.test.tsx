import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppShell } from "@/components/layout/AppShell";
import { renderWithRouter } from "../../../helpers/render-with-router";
import { AuthContext } from "@/app/auth-context";

const mocks = vi.hoisted(() => ({
  completeLogout: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("@/lib/auth-session", () => ({
  completeLogout: mocks.completeLogout,
}));

vi.mock("@/components/layout/NotificationBell", () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

const user = {
  id: "u-1",
  name: "David Chen",
  email: "david@cedarrose.local",
  role: "admin" as const,
  title: "Lead Analyst",
  initials: "DC",
};

function renderShell(isAdmin = false) {
  return renderWithRouter(
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        isLoading: false,
        isAuthenticated: true,
        isBootstrapping: false,
      }}
    >
      <AppShell>
        <div>Page content</div>
      </AppShell>
    </AuthContext.Provider>,
    { routerProps: { initialEntries: ["/cases"] } },
  );
}

describe("AppShell", () => {
  it("renders navigation and page content", () => {
    renderShell();
    expect(screen.getByText(/page content/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /all cases/i })).toHaveAttribute("href", "/cases");
    expect(screen.getByTestId("notification-bell")).toBeInTheDocument();
  });

  it("shows admin nav when user is admin", () => {
    renderShell(true);
    expect(screen.getByRole("link", { name: /form builder/i })).toHaveAttribute(
      "href",
      "/admin/form-builder",
    );
  });

  it("logs out on logout button click", async () => {
    mocks.completeLogout.mockResolvedValue(undefined);
    const clicker = userEvent.setup();
    renderShell();
    await clicker.click(screen.getByRole("button", { name: /log out/i }));
    expect(mocks.completeLogout).toHaveBeenCalled();
    expect(mocks.navigate).toHaveBeenCalledWith("/login", { replace: true });
  });

  it("refreshes header timestamp on interval", () => {
    vi.useFakeTimers();
    renderShell();
    vi.advanceTimersByTime(30_000);
    vi.useRealTimers();
  });
});
