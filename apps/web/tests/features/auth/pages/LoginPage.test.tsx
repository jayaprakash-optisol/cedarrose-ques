import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import LoginPage from "@/features/auth/pages/LoginPage";
import { authService } from "@/services";
import { ApiError } from "@/services/api/errors";
import { renderWithProviders } from "../../../helpers/render";

describe("LoginPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the welcome back heading", () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Welcome back");
  });

  it("updates the email and password fields", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    await user.type(screen.getByLabelText("Email address"), "u@e.com");
    await user.type(screen.getByLabelText("Password"), "secret");
    expect(screen.getByLabelText("Email address")).toHaveValue("u@e.com");
    expect(screen.getByLabelText("Password")).toHaveValue("secret");
  });

  it("toggles the password visibility", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    const pw = screen.getByLabelText("Password") as HTMLInputElement;
    expect(pw.type).toBe("password");
    await user.click(screen.getByLabelText("Show password"));
    expect(pw.type).toBe("text");
    await user.click(screen.getByLabelText("Hide password"));
    expect(pw.type).toBe("password");
  });

  it("calls completeLogin and navigates to /select-app on success", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(authService, "login").mockResolvedValue({
      id: "u1",
      name: "U",
      email: "u@e.com",
      role: "analyst",
      title: "Analyst",
      initials: "U",
    });
    renderWithProviders(<LoginPage />, { routerPath: "/login" });
    await user.type(screen.getByLabelText("Email address"), "u@e.com");
    await user.type(screen.getByLabelText("Password"), "secret");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith("u@e.com", "secret", false);
    });
  });

  it("displays the ApiError message on failure", async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, "login").mockRejectedValue(new ApiError("INVALID", "Bad creds", 401));
    renderWithProviders(<LoginPage />, { routerPath: "/login" });
    await user.type(screen.getByLabelText("Email address"), "u@e.com");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => {
      expect(screen.getByText("Bad creds")).toBeInTheDocument();
    });
  });

  it("falls back to a generic error on non-ApiError failures", async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, "login").mockRejectedValue(new Error("boom"));
    renderWithProviders(<LoginPage />, { routerPath: "/login" });
    await user.type(screen.getByLabelText("Email address"), "u@e.com");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => {
      expect(screen.getByText("Unable to sign in. Check your credentials and try again.")).toBeInTheDocument();
    });
  });

  it("links to /forgot-password", () => {
    renderWithProviders(<LoginPage />);
    const link = screen.getByRole("link", { name: "Forgot password?" });
    expect(link).toHaveAttribute("href", "/forgot-password");
  });
});
