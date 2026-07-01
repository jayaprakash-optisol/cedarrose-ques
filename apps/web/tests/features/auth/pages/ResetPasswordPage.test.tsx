import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import ResetPasswordPage from "@/features/auth/pages/ResetPasswordPage";
import { authService } from "@/services";
import { ApiError } from "@/services/api/errors";
import { renderWithProviders } from "../../../helpers/render";

describe("ResetPasswordPage", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("shows 'missing token' when no token is provided", async () => {
    renderWithProviders(<ResetPasswordPage />, { routerPath: "/reset-password" });
    expect(await screen.findByText("This password reset link is missing or incomplete.")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Request reset link" });
    expect(link).toHaveAttribute("href", "/forgot-password");
  });

  it("renders the form when the token is valid", async () => {
    vi.spyOn(authService, "verifyResetToken").mockResolvedValue();
    renderWithProviders(<ResetPasswordPage />, { routerPath: "/reset-password?token=abc" });
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Set a new password");
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
  });

  it("shows the invalid state when verifyResetToken throws an ApiError", async () => {
    vi.spyOn(authService, "verifyResetToken").mockRejectedValue(new ApiError("BAD", "Expired", 400));
    renderWithProviders(<ResetPasswordPage />, { routerPath: "/reset-password?token=abc" });
    expect(await screen.findByText("Expired")).toBeInTheDocument();
  });

  it("shows the fallback message for non-ApiError verify failures", async () => {
    vi.spyOn(authService, "verifyResetToken").mockRejectedValue(new Error("boom"));
    renderWithProviders(<ResetPasswordPage />, { routerPath: "/reset-password?token=abc" });
    expect(await screen.findByText("This password reset link is invalid or has expired.")).toBeInTheDocument();
  });

  it("rejects passwords shorter than 8 characters", async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, "verifyResetToken").mockResolvedValue();
    renderWithProviders(<ResetPasswordPage />, { routerPath: "/reset-password?token=abc" });
    await screen.findByLabelText("New password");
    await user.type(screen.getByLabelText("New password"), "short");
    await user.type(screen.getByLabelText("Confirm password"), "short");
    await user.click(screen.getByRole("button", { name: "Reset password" }));
    expect(await screen.findByText("Password must be at least 8 characters.")).toBeInTheDocument();
  });

  it("rejects mismatched passwords", async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, "verifyResetToken").mockResolvedValue();
    renderWithProviders(<ResetPasswordPage />, { routerPath: "/reset-password?token=abc" });
    await screen.findByLabelText("New password");
    await user.type(screen.getByLabelText("New password"), "longenough1");
    await user.type(screen.getByLabelText("Confirm password"), "different12");
    await user.click(screen.getByRole("button", { name: "Reset password" }));
    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument();
  });

  it("submits and shows the success view", async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, "verifyResetToken").mockResolvedValue();
    const resetSpy = vi.spyOn(authService, "resetPassword").mockResolvedValue();
    renderWithProviders(<ResetPasswordPage />, { routerPath: "/reset-password?token=abc" });
    await screen.findByLabelText("New password");
    await user.type(screen.getByLabelText("New password"), "validpass1");
    await user.type(screen.getByLabelText("Confirm password"), "validpass1");
    await user.click(screen.getByRole("button", { name: "Reset password" }));
    await waitFor(() => {
      expect(resetSpy).toHaveBeenCalledWith("abc", "validpass1");
    });
    expect(await screen.findByText("Password updated")).toBeInTheDocument();
  });

  it("shows the ApiError message on submit failure", async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, "verifyResetToken").mockResolvedValue();
    vi.spyOn(authService, "resetPassword").mockRejectedValue(new ApiError("BAD", "Token expired", 400));
    renderWithProviders(<ResetPasswordPage />, { routerPath: "/reset-password?token=abc" });
    await screen.findByLabelText("New password");
    await user.type(screen.getByLabelText("New password"), "validpass1");
    await user.type(screen.getByLabelText("Confirm password"), "validpass1");
    await user.click(screen.getByRole("button", { name: "Reset password" }));
    expect(await screen.findByText("Token expired")).toBeInTheDocument();
  });

  it("shows a generic error on non-ApiError submit failure", async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, "verifyResetToken").mockResolvedValue();
    vi.spyOn(authService, "resetPassword").mockRejectedValue(new Error("boom"));
    renderWithProviders(<ResetPasswordPage />, { routerPath: "/reset-password?token=abc" });
    await screen.findByLabelText("New password");
    await user.type(screen.getByLabelText("New password"), "validpass1");
    await user.type(screen.getByLabelText("Confirm password"), "validpass1");
    await user.click(screen.getByRole("button", { name: "Reset password" }));
    expect(await screen.findByText("Unable to reset password. The link may have expired.")).toBeInTheDocument();
  });

  it("toggles password visibility for both fields", async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, "verifyResetToken").mockResolvedValue();
    renderWithProviders(<ResetPasswordPage />, { routerPath: "/reset-password?token=abc" });
    const pw = (await screen.findByLabelText("New password")) as HTMLInputElement;
    const cpw = screen.getByLabelText("Confirm password") as HTMLInputElement;
    expect(pw.type).toBe("password");
    expect(cpw.type).toBe("password");
    await user.click(screen.getAllByLabelText("Show password")[0]);
    expect(pw.type).toBe("text");
    await user.click(screen.getAllByLabelText("Hide password")[0]);
    expect(pw.type).toBe("password");
  });
});
