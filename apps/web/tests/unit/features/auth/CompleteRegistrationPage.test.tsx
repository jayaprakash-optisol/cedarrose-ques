import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CompleteRegistrationPage from "@/features/auth/pages/CompleteRegistrationPage";
import { renderWithRouter } from "../../../helpers/render-with-router";

const mocks = vi.hoisted(() => ({
  verifyInvitation: vi.fn(),
  completeRegistration: vi.fn(),
}));

vi.mock("@/services", () => ({
  authService: {
    verifyInvitation: mocks.verifyInvitation,
    completeRegistration: mocks.completeRegistration,
  },
}));

describe("CompleteRegistrationPage", () => {
  beforeEach(() => {
    mocks.verifyInvitation.mockReset();
    mocks.completeRegistration.mockReset();
  });

  it("shows invalid state when token is missing", async () => {
    renderWithRouter(<CompleteRegistrationPage />);
    await waitFor(() => {
      expect(screen.getByText(/invitation unavailable/i)).toBeInTheDocument();
    });
  });

  it("renders registration form after token verification", async () => {
    mocks.verifyInvitation.mockResolvedValue({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@cedarrose.local",
      role: "Analyst",
    });

    renderWithRouter(<CompleteRegistrationPage />, {
      routerProps: { initialEntries: ["/complete-registration?token=valid-token"] },
    });

    await waitFor(() => {
      expect(screen.getByText(/welcome, jane/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/jane@cedarrose.local/i)).toBeInTheDocument();
  });

  it("submits password and shows success", async () => {
    mocks.verifyInvitation.mockResolvedValue({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@cedarrose.local",
      role: "Analyst",
    });
    mocks.completeRegistration.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithRouter(<CompleteRegistrationPage />, {
      routerProps: { initialEntries: ["/complete-registration?token=valid-token"] },
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/at least 8 characters/i)).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText(/at least 8 characters/i), "Password123");
    await user.type(screen.getByPlaceholderText(/re-enter your password/i), "Password123");
    await user.click(screen.getByRole("button", { name: /activate account/i }));

    await waitFor(() => {
      expect(screen.getByText(/account activated/i)).toBeInTheDocument();
    });
    expect(mocks.completeRegistration).toHaveBeenCalledWith("valid-token", "Password123");
    await user.click(screen.getByRole("button", { name: /continue to sign in/i }));
  });

  it("shows invalid state when verify fails", async () => {
    mocks.verifyInvitation.mockRejectedValue(new Error("bad token"));
    renderWithRouter(<CompleteRegistrationPage />, {
      routerProps: { initialEntries: ["/complete-registration?token=bad"] },
    });
    await waitFor(() => {
      expect(screen.getByText(/invitation unavailable/i)).toBeInTheDocument();
    });
  });

  it("validates password rules before submit", async () => {
    mocks.verifyInvitation.mockResolvedValue({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@cedarrose.local",
      role: "Analyst",
    });
    const user = userEvent.setup();
    renderWithRouter(<CompleteRegistrationPage />, {
      routerProps: { initialEntries: ["/complete-registration?token=valid-token"] },
    });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/at least 8 characters/i)).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText(/at least 8 characters/i), "short");
    await user.type(screen.getByPlaceholderText(/re-enter your password/i), "different");
    await user.click(screen.getByRole("button", { name: /activate account/i }));
    expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText(/at least 8 characters/i));
    await user.type(screen.getByPlaceholderText(/at least 8 characters/i), "Password123");
    await user.click(screen.getByRole("button", { name: /activate account/i }));
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /show password/i })[0]);
    expect(screen.getByRole("button", { name: /hide password/i })).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: /show password/i })[0]);
  });

  it("shows loading state while verifying token", async () => {
    mocks.verifyInvitation.mockImplementation(() => new Promise(() => undefined));
    renderWithRouter(<CompleteRegistrationPage />, {
      routerProps: { initialEntries: ["/complete-registration?token=pending"] },
    });
    expect(screen.getByText(/verifying your invitation/i)).toBeInTheDocument();
  });

  it("shows error when registration submit fails", async () => {
    mocks.verifyInvitation.mockResolvedValue({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@cedarrose.local",
      role: "Analyst",
    });
    mocks.completeRegistration.mockRejectedValue(new Error("fail"));
    const user = userEvent.setup();
    renderWithRouter(<CompleteRegistrationPage />, {
      routerProps: { initialEntries: ["/complete-registration?token=valid-token"] },
    });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/at least 8 characters/i)).toBeInTheDocument();
    });
    await user.type(screen.getByPlaceholderText(/at least 8 characters/i), "Password123");
    await user.type(screen.getByPlaceholderText(/re-enter your password/i), "Password123");
    await user.click(screen.getByRole("button", { name: /activate account/i }));
    await waitFor(() => {
      expect(screen.getByText(/unable to complete registration/i)).toBeInTheDocument();
    });
  });
});
