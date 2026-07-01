import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import ForgotPasswordPage from "@/features/auth/pages/ForgotPasswordPage";
import { authService } from "@/services";
import { ApiError } from "@/services/api/errors";
import { renderWithProviders } from "../../../helpers/render";

describe("ForgotPasswordPage", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("renders the title and email input", () => {
    renderWithProviders(<ForgotPasswordPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Forgot password?");
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
  });

  it("submits the email and switches to the success view", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(authService, "forgotPassword").mockResolvedValue();
    renderWithProviders(<ForgotPasswordPage />);
    await user.type(screen.getByLabelText("Email address"), "u@e.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith("u@e.com");
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Check your email");
    });
  });

  it("trims the email before sending", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(authService, "forgotPassword").mockResolvedValue();
    renderWithProviders(<ForgotPasswordPage />);
    await user.type(screen.getByLabelText("Email address"), "  u@e.com  ");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith("u@e.com");
    });
  });

  it("shows the ApiError message on failure", async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, "forgotPassword").mockRejectedValue(new ApiError("BAD", "Not allowed", 403));
    renderWithProviders(<ForgotPasswordPage />);
    await user.type(screen.getByLabelText("Email address"), "u@e.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));
    await waitFor(() => {
      expect(screen.getByText("Not allowed")).toBeInTheDocument();
    });
  });

  it("falls back to a generic error on non-ApiError", async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, "forgotPassword").mockRejectedValue(new Error("boom"));
    renderWithProviders(<ForgotPasswordPage />);
    await user.type(screen.getByLabelText("Email address"), "u@e.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));
    await waitFor(() => {
      expect(screen.getByText("Unable to send reset email. Please try again.")).toBeInTheDocument();
    });
  });

  it("links back to /login", () => {
    renderWithProviders(<ForgotPasswordPage />);
    const link = screen.getByRole("link", { name: "Back to sign in" });
    expect(link).toHaveAttribute("href", "/login");
  });

  it("success view shows the email and a back-to-login button", async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, "forgotPassword").mockResolvedValue();
    renderWithProviders(<ForgotPasswordPage />);
    await user.type(screen.getByLabelText("Email address"), "u@e.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));
    await waitFor(() => {
      expect(screen.getByText(/We sent a link to/)).toBeInTheDocument();
    });
  });
});
