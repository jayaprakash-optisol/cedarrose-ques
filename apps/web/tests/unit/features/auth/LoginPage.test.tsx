import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "@/features/auth/pages/LoginPage";
import { renderWithRouter } from "../../../helpers/render-with-router";

const mocks = vi.hoisted(() => ({
  completeLogin: vi.fn(),
}));

vi.mock("@/services", () => ({
  authService: {
    login: vi.fn(),
  },
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQueryClient: () => ({
      setQueryData: vi.fn(),
      removeQueries: vi.fn(),
    }),
  };
});

vi.mock("@/lib/auth-session", () => ({
  completeLogin: mocks.completeLogin,
}));

describe("LoginPage", () => {
  it("renders login form and forgot-password link", () => {
    renderWithRouter(<LoginPage />);

    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@cedarrose.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /forgot password/i })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });

  it("submits credentials through completeLogin", async () => {
    mocks.completeLogin.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithRouter(<LoginPage />);
    await user.type(screen.getByPlaceholderText(/you@cedarrose.com/i), "user@cedarrose.com");
    await user.type(screen.getByPlaceholderText(/enter your password/i), "Password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mocks.completeLogin).toHaveBeenCalled();
    });
  });

  it("shows error message when login fails", async () => {
    const { ApiError } = await import("@/services/api/errors");
    mocks.completeLogin.mockRejectedValue(new ApiError("AUTH", "Invalid email or password", 401));
    const user = userEvent.setup();

    renderWithRouter(<LoginPage />);
    await user.type(screen.getByPlaceholderText(/you@cedarrose.com/i), "user@cedarrose.com");
    await user.type(screen.getByPlaceholderText(/enter your password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    renderWithRouter(<LoginPage />);
    await user.click(screen.getByRole("button", { name: /show password/i }));
    expect(screen.getByRole("button", { name: /hide password/i })).toBeInTheDocument();
  });
});
