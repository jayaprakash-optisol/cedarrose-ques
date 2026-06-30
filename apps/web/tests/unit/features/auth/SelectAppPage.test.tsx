import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SelectAppPage from "@/features/auth/pages/SelectAppPage";
import { renderWithRouter } from "../../../helpers/render-with-router";
import { AuthContext } from "@/app/auth-context";

const mocks = vi.hoisted(() => ({
  completeLogout: vi.fn(),
  setAppSelected: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("@/lib/auth-session", () => ({
  completeLogout: mocks.completeLogout,
}));

vi.mock("@/lib/app-selection", () => ({
  setAppSelected: mocks.setAppSelected,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

vi.mock("sonner", () => ({
  toast: { message: vi.fn() },
}));

const user = {
  id: "u-1",
  name: "David Chen",
  email: "david@cedarrose.local",
  role: "admin" as const,
  title: "Lead Analyst",
  initials: "DC",
};

function renderPage() {
  return renderWithRouter(
    <AuthContext.Provider
      value={{
        user,
        isAdmin: true,
        isLoading: false,
        isAuthenticated: true,
        isBootstrapping: false,
      }}
    >
      <SelectAppPage />
    </AuthContext.Provider>,
  );
}

describe("SelectAppPage", () => {
  it("renders greeting and app cards", () => {
    renderPage();
    expect(screen.getByText(/david\./i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open qa questionnaire/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open qa automation/i })).toBeInTheDocument();
  });

  it("opens questionnaire app on card click", async () => {
    const clicker = userEvent.setup();
    renderPage();
    await clicker.click(screen.getByRole("button", { name: /open qa questionnaire/i }));
    expect(mocks.setAppSelected).toHaveBeenCalledWith("questionnaire");
    expect(mocks.navigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("opens automation app on card click", async () => {
    const clicker = userEvent.setup();
    renderPage();
    await clicker.click(screen.getByRole("button", { name: /open qa automation/i }));
    expect(mocks.setAppSelected).toHaveBeenCalledWith("automation");
    expect(mocks.navigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("signs out when sign out clicked", async () => {
    mocks.completeLogout.mockResolvedValue(undefined);
    const clicker = userEvent.setup();
    renderPage();
    await clicker.click(screen.getByRole("button", { name: /sign out/i }));
    expect(mocks.completeLogout).toHaveBeenCalled();
    expect(mocks.navigate).toHaveBeenCalledWith("/login", { replace: true });
  });
});
