import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Routes, Route } from "react-router-dom";
import QuestionnaireLandingPage from "@/features/questionnaire/pages/QuestionnaireLandingPage";
import { renderWithRouter } from "../../../helpers/render-with-router";

const mocks = vi.hoisted(() => ({
  verifyLink: vi.fn(),
  requestOtp: vi.fn(),
}));

vi.mock("@/services", () => ({
  questionnaireService: {
    verifyLink: mocks.verifyLink,
    requestOtp: mocks.requestOtp,
  },
}));

vi.mock("@/features/questionnaire/components/QuestionnaireShell", () => ({
  QuestionnaireShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

function renderPage(token = "valid-token") {
  return renderWithRouter(
    <Routes>
      <Route path="/q/:token" element={<QuestionnaireLandingPage />} />
      <Route path="/q/:token/otp" element={<div>OTP page</div>} />
      <Route path="/q/:token/form" element={<div>Form page</div>} />
      <Route path="/q/:token/expired" element={<div>Expired page</div>} />
    </Routes>,
    { routerProps: { initialEntries: [`/q/${token}`] } },
  );
}

describe("QuestionnaireLandingPage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    mocks.verifyLink.mockReset();
    mocks.requestOtp.mockReset();
  });

  it("shows loading state while verifying link", () => {
    mocks.verifyLink.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByText(/verifying your secure link/i)).toBeInTheDocument();
  });

  it("verifies link and shows send code UI", async () => {
    mocks.verifyLink.mockResolvedValue({
      caseId: "c-1",
      subjectName: "Acme",
      recipientType: "Supplier",
      maskedEmail: "a***@acme.com",
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/credit information request/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /send verification code/i })).toBeInTheDocument();
  });

  it("navigates to OTP page after sending code", async () => {
    mocks.verifyLink.mockResolvedValue({
      caseId: "c-1",
      subjectName: "Acme",
      recipientType: "Supplier",
      maskedEmail: "a***@acme.com",
    });
    mocks.requestOtp.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /send verification code/i })).toBeEnabled();
    });
    await user.click(screen.getByRole("button", { name: /send verification code/i }));

    await waitFor(() => {
      expect(screen.getByText(/otp page/i)).toBeInTheDocument();
    });
  });

  it("redirects to expired page when link invalid", async () => {
    mocks.verifyLink.mockRejectedValue(new Error("expired"));
    renderPage("bad-token");

    await waitFor(() => {
      expect(screen.getByText(/expired page/i)).toBeInTheDocument();
    });
  });

  it("redirects to form when session already has token", async () => {
    sessionStorage.setItem(
      "q_session_valid-token",
      JSON.stringify({
        caseId: "c-1",
        subjectName: "Acme",
        recipientType: "Supplier",
        maskedEmail: "a***@acme.com",
        sessionToken: "sess-1",
      }),
    );

    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/form page/i)).toBeInTheDocument();
    });
    expect(mocks.verifyLink).not.toHaveBeenCalled();
  });

  it("uses stored session without token and skips verify", async () => {
    sessionStorage.setItem(
      "q_session_valid-token",
      JSON.stringify({
        caseId: "c-1",
        subjectName: "Acme",
        recipientType: "Supplier",
        maskedEmail: "a***@acme.com",
      }),
    );

    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/credit information request/i)).toBeInTheDocument();
    });
    expect(mocks.verifyLink).not.toHaveBeenCalled();
  });

  it("clears corrupt session and verifies link", async () => {
    sessionStorage.setItem("q_session_valid-token", "not-json");
    mocks.verifyLink.mockResolvedValue({
      caseId: "c-1",
      subjectName: "Acme",
      recipientType: "Supplier",
      maskedEmail: "a***@acme.com",
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/credit information request/i)).toBeInTheDocument();
    });
    expect(mocks.verifyLink).toHaveBeenCalled();
  });

  it("shows toast when send code fails", async () => {
    mocks.verifyLink.mockResolvedValue({
      caseId: "c-1",
      subjectName: "Acme",
      recipientType: "Supplier",
      maskedEmail: "a***@acme.com",
    });
    mocks.requestOtp.mockRejectedValue(new Error("SMTP down"));
    const user = userEvent.setup();

    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /send verification code/i })).toBeEnabled();
    });
    await user.click(screen.getByRole("button", { name: /send verification code/i }));

    const { toast } = await import("sonner");
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });
});
