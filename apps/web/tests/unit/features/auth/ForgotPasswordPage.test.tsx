import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ForgotPasswordPage from "@/features/auth/pages/ForgotPasswordPage";
import { renderWithRouter } from "../../../helpers/render-with-router";

const mocks = vi.hoisted(() => ({
  forgotPassword: vi.fn(),
}));

vi.mock("@/services", () => ({
  authService: {
    forgotPassword: mocks.forgotPassword,
  },
}));

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    mocks.forgotPassword.mockReset();
  });

  it("renders email form with security-aligned copy", () => {
    renderWithRouter(<ForgotPasswordPage />);
    expect(screen.getByRole("heading", { name: /forgot password/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@cedarrose.com/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send reset link/i })).toBeInTheDocument();
  });

  it("shows success state without revealing account existence details", async () => {
    mocks.forgotPassword.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithRouter(<ForgotPasswordPage />);
    await user.type(screen.getByPlaceholderText(/you@cedarrose.com/i), "user@cedarrose.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /check your email/i })).toBeInTheDocument();
    });
    expect(mocks.forgotPassword).toHaveBeenCalledWith("user@cedarrose.com");
  });

  it("shows API error message on failure", async () => {
    const { ApiError } = await import("@/services/api/errors");
    mocks.forgotPassword.mockRejectedValue(new ApiError("RATE_LIMIT", "Too many requests", 429));
    const user = userEvent.setup();

    renderWithRouter(<ForgotPasswordPage />);
    await user.type(screen.getByPlaceholderText(/you@cedarrose.com/i), "user@cedarrose.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
    });
  });

  it("shows generic error on failure", async () => {
    mocks.forgotPassword.mockRejectedValue(new Error("network"));
    const user = userEvent.setup();
    renderWithRouter(<ForgotPasswordPage />);
    await user.type(screen.getByPlaceholderText(/you@cedarrose.com/i), "user@cedarrose.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));
    await waitFor(() => {
      expect(screen.getByText(/unable to send reset email/i)).toBeInTheDocument();
    });
  });

  it("clears shake animation after error", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mocks.forgotPassword.mockRejectedValue(new Error("fail"));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithRouter(<ForgotPasswordPage />);
    await user.type(screen.getByPlaceholderText(/you@cedarrose.com/i), "user@cedarrose.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));
    await waitFor(() => {
      expect(screen.getByText(/unable to send reset email/i)).toBeInTheDocument();
    });
    await vi.advanceTimersByTimeAsync(350);
    vi.useRealTimers();
  });
});
