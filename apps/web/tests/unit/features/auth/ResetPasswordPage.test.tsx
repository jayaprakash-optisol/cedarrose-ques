import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResetPasswordPage from "@/features/auth/pages/ResetPasswordPage";
import { renderWithRouter } from "../../../helpers/render-with-router";

const mocks = vi.hoisted(() => ({
  verifyResetToken: vi.fn(),
  resetPassword: vi.fn(),
}));

vi.mock("@/services", () => ({
  authService: {
    verifyResetToken: mocks.verifyResetToken,
    resetPassword: mocks.resetPassword,
  },
}));

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    mocks.verifyResetToken.mockReset();
    mocks.resetPassword.mockReset();
  });

  it("shows invalid state when token is missing", async () => {
    renderWithRouter(<ResetPasswordPage />, { routerProps: { initialEntries: ["/reset-password"] } });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /reset link invalid/i })).toBeInTheDocument();
    });
    expect(mocks.verifyResetToken).not.toHaveBeenCalled();
  });

  it("shows invalid state when token was already used", async () => {
    const { ApiError } = await import("@/services/api/errors");
    mocks.verifyResetToken.mockRejectedValue(
      new ApiError("VALIDATION_ERROR", "This reset token has already been used", 400),
    );

    renderWithRouter(<ResetPasswordPage />, {
      routerProps: { initialEntries: ["/reset-password?token=used-token"] },
    });

    await waitFor(() => {
      expect(screen.getByText(/already been used/i)).toBeInTheDocument();
    });
  });

  it("renders password form for valid token", async () => {
    mocks.verifyResetToken.mockResolvedValue(undefined);

    renderWithRouter(<ResetPasswordPage />, {
      routerProps: { initialEntries: ["/reset-password?token=valid-token"] },
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /set a new password/i })).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it("submits new password and shows success", async () => {
    mocks.verifyResetToken.mockResolvedValue(undefined);
    mocks.resetPassword.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithRouter(<ResetPasswordPage />, {
      routerProps: { initialEntries: ["/reset-password?token=valid-token"] },
    });

    await waitFor(() => screen.getByPlaceholderText(/at least 8 characters/i));

    await user.type(screen.getByPlaceholderText(/at least 8 characters/i), "NewPass456");
    await user.type(screen.getByPlaceholderText(/re-enter your password/i), "NewPass456");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /password updated/i })).toBeInTheDocument();
    });
    expect(mocks.resetPassword).toHaveBeenCalledWith("valid-token", "NewPass456");
    await user.click(screen.getByRole("button", { name: /continue to sign in/i }));
  });

  it("blocks submit when passwords do not match", async () => {
    mocks.verifyResetToken.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithRouter(<ResetPasswordPage />, {
      routerProps: { initialEntries: ["/reset-password?token=valid-token"] },
    });

    await waitFor(() => screen.getByPlaceholderText(/at least 8 characters/i));
    await user.type(screen.getByPlaceholderText(/at least 8 characters/i), "NewPass456");
    await user.type(screen.getByPlaceholderText(/re-enter your password/i), "Mismatch1");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
    expect(mocks.resetPassword).not.toHaveBeenCalled();
  });

  it("shows loading state while verifying token", () => {
    mocks.verifyResetToken.mockImplementation(() => new Promise(() => undefined));

    renderWithRouter(<ResetPasswordPage />, {
      routerProps: { initialEntries: ["/reset-password?token=pending-token"] },
    });

    expect(screen.getByRole("heading", { name: /checking reset link/i })).toBeInTheDocument();
  });

  it("rejects passwords shorter than 8 characters", async () => {
    mocks.verifyResetToken.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithRouter(<ResetPasswordPage />, {
      routerProps: { initialEntries: ["/reset-password?token=valid-token"] },
    });

    await waitFor(() => screen.getByPlaceholderText(/at least 8 characters/i));
    await user.type(screen.getByPlaceholderText(/at least 8 characters/i), "short");
    await user.type(screen.getByPlaceholderText(/re-enter your password/i), "short");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it("shows error when reset fails", async () => {
    mocks.verifyResetToken.mockResolvedValue(undefined);
    mocks.resetPassword.mockRejectedValue(new Error("expired"));
    const user = userEvent.setup();
    renderWithRouter(<ResetPasswordPage />, {
      routerProps: { initialEntries: ["/reset-password?token=valid-token"] },
    });
    await waitFor(() => screen.getByPlaceholderText(/at least 8 characters/i));
    await user.type(screen.getByPlaceholderText(/at least 8 characters/i), "NewPass456");
    await user.type(screen.getByPlaceholderText(/re-enter your password/i), "NewPass456");
    await user.click(screen.getByRole("button", { name: /reset password/i }));
    await waitFor(() => {
      expect(screen.getByText(/unable to reset password/i)).toBeInTheDocument();
    });
  });

  it("toggles password visibility", async () => {
    mocks.verifyResetToken.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithRouter(<ResetPasswordPage />, {
      routerProps: { initialEntries: ["/reset-password?token=valid-token"] },
    });
    await waitFor(() => screen.getByPlaceholderText(/at least 8 characters/i));
    await user.click(screen.getAllByRole("button", { name: /show password/i })[0]);
    expect(screen.getAllByRole("button", { name: /hide password/i }).length).toBeGreaterThan(0);
    await user.click(screen.getAllByRole("button", { name: /show password/i })[1]);
  });
});
