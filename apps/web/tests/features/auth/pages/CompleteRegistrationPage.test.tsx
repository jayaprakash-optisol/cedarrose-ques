import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import CompleteRegistrationPage from "@/features/auth/pages/CompleteRegistrationPage";
import { authService } from "@/services";
import { ApiError } from "@/services/api/errors";
import { renderWithProviders } from "../../../helpers/render";

describe("CompleteRegistrationPage", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("shows 'No invitation token' when no token is provided", async () => {
    renderWithProviders(<CompleteRegistrationPage />, { routerPath: "/complete-registration" });
    expect(await screen.findByText("No invitation token was provided.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/login");
  });

  it("renders the form when the token is valid", async () => {
    vi.spyOn(authService, "verifyInvitation").mockResolvedValue({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      role: "Analyst",
    });
    renderWithProviders(<CompleteRegistrationPage />, { routerPath: "/complete-registration?token=abc" });
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Welcome, Jane");
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("Analyst")).toBeInTheDocument();
  });

  it("renders the form with the full name when both first and last are present", async () => {
    vi.spyOn(authService, "verifyInvitation").mockResolvedValue({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      role: "Analyst",
    });
    renderWithProviders(<CompleteRegistrationPage />, { routerPath: "/complete-registration?token=abc" });
    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
  });

  it("renders the form with just firstName when lastName is empty", async () => {
    vi.spyOn(authService, "verifyInvitation").mockResolvedValue({
      firstName: "Jane",
      lastName: "",
      email: "jane@example.com",
      role: "Analyst",
    });
    renderWithProviders(<CompleteRegistrationPage />, { routerPath: "/complete-registration?token=abc" });
    expect(await screen.findByText("Welcome, Jane")).toBeInTheDocument();
  });

  it("shows the invalid state when the API rejects the token", async () => {
    vi.spyOn(authService, "verifyInvitation").mockRejectedValue(new ApiError("BAD", "Invalid", 400));
    renderWithProviders(<CompleteRegistrationPage />, { routerPath: "/complete-registration?token=abc" });
    expect(await screen.findByText("Invalid")).toBeInTheDocument();
    expect(screen.getByText("Invitation unavailable")).toBeInTheDocument();
  });

  it("shows a fallback message for non-ApiError verify failures", async () => {
    vi.spyOn(authService, "verifyInvitation").mockRejectedValue(new Error("boom"));
    renderWithProviders(<CompleteRegistrationPage />, { routerPath: "/complete-registration?token=abc" });
    expect(await screen.findByText("This invitation link is invalid or has expired.")).toBeInTheDocument();
  });

  it("rejects passwords shorter than 8 characters", async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, "verifyInvitation").mockResolvedValue({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      role: "Analyst",
    });
    renderWithProviders(<CompleteRegistrationPage />, { routerPath: "/complete-registration?token=abc" });
    await screen.findByLabelText("New password");
    await user.type(screen.getByLabelText("New password"), "short");
    await user.type(screen.getByLabelText("Confirm password"), "short");
    await user.click(screen.getByRole("button", { name: "Activate account" }));
    expect(await screen.findByText("Password must be at least 8 characters.")).toBeInTheDocument();
  });

  it("rejects mismatched passwords", async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, "verifyInvitation").mockResolvedValue({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      role: "Analyst",
    });
    renderWithProviders(<CompleteRegistrationPage />, { routerPath: "/complete-registration?token=abc" });
    await screen.findByLabelText("New password");
    await user.type(screen.getByLabelText("New password"), "longenough");
    await user.type(screen.getByLabelText("Confirm password"), "different12");
    await user.click(screen.getByRole("button", { name: "Activate account" }));
    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument();
  });

  it("submits and shows the success view", async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, "verifyInvitation").mockResolvedValue({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      role: "Analyst",
    });
    const completeSpy = vi.spyOn(authService, "completeRegistration").mockResolvedValue();
    renderWithProviders(<CompleteRegistrationPage />, { routerPath: "/complete-registration?token=abc" });
    await screen.findByLabelText("New password");
    await user.type(screen.getByLabelText("New password"), "validpass1");
    await user.type(screen.getByLabelText("Confirm password"), "validpass1");
    await user.click(screen.getByRole("button", { name: "Activate account" }));
    await waitFor(() => {
      expect(completeSpy).toHaveBeenCalledWith("abc", "validpass1");
    });
    expect(await screen.findByText("Account activated")).toBeInTheDocument();
  });

  it("shows the ApiError message on submit failure", async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, "verifyInvitation").mockResolvedValue({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      role: "Analyst",
    });
    vi.spyOn(authService, "completeRegistration").mockRejectedValue(new ApiError("BAD", "Token expired", 400));
    renderWithProviders(<CompleteRegistrationPage />, { routerPath: "/complete-registration?token=abc" });
    await screen.findByLabelText("New password");
    await user.type(screen.getByLabelText("New password"), "validpass1");
    await user.type(screen.getByLabelText("Confirm password"), "validpass1");
    await user.click(screen.getByRole("button", { name: "Activate account" }));
    expect(await screen.findByText("Token expired")).toBeInTheDocument();
  });

  it("shows a generic error on non-ApiError submit failure", async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, "verifyInvitation").mockResolvedValue({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      role: "Analyst",
    });
    vi.spyOn(authService, "completeRegistration").mockRejectedValue(new Error("boom"));
    renderWithProviders(<CompleteRegistrationPage />, { routerPath: "/complete-registration?token=abc" });
    await screen.findByLabelText("New password");
    await user.type(screen.getByLabelText("New password"), "validpass1");
    await user.type(screen.getByLabelText("Confirm password"), "validpass1");
    await user.click(screen.getByRole("button", { name: "Activate account" }));
    expect(await screen.findByText("Unable to complete registration. Please try again.")).toBeInTheDocument();
  });

  it("toggles password visibility for both fields", async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, "verifyInvitation").mockResolvedValue({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      role: "Analyst",
    });
    renderWithProviders(<CompleteRegistrationPage />, { routerPath: "/complete-registration?token=abc" });
    const pw = (await screen.findByLabelText("New password")) as HTMLInputElement;
    const cpw = screen.getByLabelText("Confirm password") as HTMLInputElement;
    expect(pw.type).toBe("password");
    expect(cpw.type).toBe("password");
    const toggles = screen.getAllByLabelText("Show password");
    await user.click(toggles[0]);
    expect(pw.type).toBe("text");
    await user.click(screen.getAllByLabelText("Hide password")[0]);
    expect(pw.type).toBe("password");
  });
});
