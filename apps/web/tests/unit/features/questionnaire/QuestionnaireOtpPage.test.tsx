import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Routes, Route } from "react-router-dom";
import QuestionnaireOtpPage from "@/features/questionnaire/pages/QuestionnaireOtpPage";
import { renderWithRouter } from "../../../helpers/render-with-router";

const mocks = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  requestOtp: vi.fn(),
}));

vi.mock("@/services", () => ({
  questionnaireService: {
    verifyOtp: mocks.verifyOtp,
    requestOtp: mocks.requestOtp,
  },
}));

vi.mock("@/features/questionnaire/components/QuestionnaireShell", () => ({
  QuestionnaireShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

const session = {
  caseId: "c-1",
  subjectName: "Acme",
  recipientType: "Supplier",
  maskedEmail: "a***@acme.com",
};

function renderPage() {
  return renderWithRouter(
    <Routes>
      <Route path="/q/:token" element={<div>Landing</div>} />
      <Route path="/q/:token/otp" element={<QuestionnaireOtpPage />} />
      <Route path="/q/:token/form" element={<div>Form page</div>} />
    </Routes>,
    { routerProps: { initialEntries: ["/q/tok-1/otp"] } },
  );
}

describe("QuestionnaireOtpPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    sessionStorage.setItem("q_session_tok-1", JSON.stringify(session));
    mocks.verifyOtp.mockReset();
    mocks.requestOtp.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders OTP form with masked email", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/verify your identity/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/a\*\*\*@acme.com/i)).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(6);
  });

  it("redirects when session missing", async () => {
    sessionStorage.clear();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/landing/i)).toBeInTheDocument();
    });
  });

  it("verifies OTP and navigates to form", async () => {
    mocks.verifyOtp.mockResolvedValue({ sessionToken: "sess-1", caseId: "c-1", rawToken: "tok-1" });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();

    await waitFor(() => {
      expect(screen.getByLabelText("Digit 1")).toBeInTheDocument();
    });

    for (let i = 1; i <= 6; i++) {
      await user.type(screen.getByLabelText(`Digit ${i}`), String(i));
    }
    await user.click(screen.getByRole("button", { name: /verify & access form/i }));

    await waitFor(() => {
      expect(screen.getByText(/form page/i)).toBeInTheDocument();
    });
    expect(mocks.verifyOtp).toHaveBeenCalledWith("tok-1", "123456");
  });

  it("shows error for incomplete OTP", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText("Digit 1")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText("Digit 1"), "1");
    await user.click(screen.getByRole("button", { name: /verify & access form/i }));
    expect(screen.queryByText(/complete 6-digit code/i)).not.toBeInTheDocument();
  });

  it("handles invalid OTP with retry message", async () => {
    mocks.verifyOtp.mockRejectedValue(new Error("Invalid code"));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();

    await waitFor(() => {
      expect(screen.getByLabelText("Digit 1")).toBeInTheDocument();
    });

    for (let i = 1; i <= 6; i++) {
      await user.type(screen.getByLabelText(`Digit ${i}`), "9");
    }
    await user.click(screen.getByRole("button", { name: /verify & access form/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid code/i)).toBeInTheDocument();
    });
  });

  it("locks out after three failed attempts", async () => {
    mocks.verifyOtp.mockRejectedValue(new Error("Invalid code"));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();

    await waitFor(() => {
      expect(screen.getByLabelText("Digit 1")).toBeInTheDocument();
    });

    for (let attempt = 0; attempt < 3; attempt++) {
      for (let i = 1; i <= 6; i++) {
        const input = screen.getByLabelText(`Digit ${i}`);
        await user.clear(input);
        await user.type(input, "0");
      }
      await user.click(screen.getByRole("button", { name: /verify & access form/i }));
    }

    await waitFor(() => {
      expect(screen.getByText(/too many incorrect attempts/i)).toBeInTheDocument();
    });
  });

  it("resends OTP and shows confirmation", async () => {
    mocks.requestOtp.mockResolvedValue(undefined);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /resend code/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /resend code/i }));
    await waitFor(() => {
      expect(screen.getByText(/new code has been sent/i)).toBeInTheDocument();
    });
    expect(mocks.requestOtp).toHaveBeenCalledWith("tok-1");
  });

  it("shows toast when resend fails", async () => {
    mocks.requestOtp.mockRejectedValue(new Error("fail"));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /resend code/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /resend code/i }));
    const { toast } = await import("sonner");
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it("shows expired code when timer elapses", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/code expires in/i)).toBeInTheDocument();
    });

    await vi.advanceTimersByTimeAsync(10 * 60 * 1000 + 1000);
    await waitFor(() => {
      expect(screen.getByText(/code expired/i)).toBeInTheDocument();
    });
  });
});
