import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import QuestionnaireOtpPage from "@/features/questionnaire/pages/QuestionnaireOtpPage";
import { makeQueryClient } from "../../../helpers/render";
import { TooltipProvider } from "@/components/ui/tooltip";

const { mockVerifyOtp, mockRequestOtp } = vi.hoisted(() => ({
  mockVerifyOtp: vi.fn(),
  mockRequestOtp: vi.fn(),
}));

vi.mock("@/services", () => {
  const noop = vi.fn(() => Promise.resolve(undefined));
  const noopResolved = vi.fn().mockResolvedValue(undefined);
  const noopList = vi.fn().mockResolvedValue([]);
  return {
    questionnaireService: { verifyLink: noop, requestOtp: mockRequestOtp, verifyOtp: mockVerifyOtp, getForm: noop, saveProgress: noopResolved, submit: noopResolved },
    auditService: { list: noopList, exportCsv: noop },
    casesService: { list: noopList, getById: noop, create: noop, exportCsv: noop, resendLink: noopResolved },
    notificationsService: { list: noopList, markRead: noopResolved, markAllRead: noopResolved, save: noopResolved },
    authService: { login: noop, logout: noopResolved, getCurrentUser: noop },
    settingsService: { get: noop, save: noop, changePassword: noopResolved },
    companiesService: { getByUid: noop },
    usersService: { list: noopList, save: noop },
    templatesService: { list: noopList, getById: noop, create: noop, save: noop, updateStatus: noop, delete: noopResolved, saveAll: noop },
    configService: { get: noop, save: noop },
    dashboardService: { getCompletionStats: noop },
  };
});

const TOKEN = "otp-token-abc";

function setupSession(token: string) {
  const key = `q_session_${token}`;
  sessionStorage.setItem(
    key,
    JSON.stringify({
      caseId: "case-1",
      subjectName: "Test Co",
      recipientType: "Supplier",
      maskedEmail: "t***@example.com",
    }),
  );
}

function renderOtpPage(path: string) {
  const qc = makeQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider delayDuration={0}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/q/:token/otp" element={<QuestionnaireOtpPage />} />
            <Route path="/q/:token" element={<div>Landing</div>} />
            <Route path="/q/:token/form" element={<div>Form</div>} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe("QuestionnaireOtpPage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    setupSession(TOKEN);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the verify heading and masked email", async () => {
    renderOtpPage(`/q/${TOKEN}/otp`);
    await waitFor(() => {
      expect(screen.getByText("Verify your identity")).toBeInTheDocument();
    });
    expect(screen.getByText("t***@example.com")).toBeInTheDocument();
  });

  it("renders 6 OTP input fields", async () => {
    renderOtpPage(`/q/${TOKEN}/otp`);
    await waitFor(() => {
      expect(screen.getByLabelText("Digit 1")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Digit 6")).toBeInTheDocument();
  });

  it("shows the timer countdown", async () => {
    renderOtpPage(`/q/${TOKEN}/otp`);
    await waitFor(() => {
      expect(screen.getByText(/Code expires in/)).toBeInTheDocument();
    });
    expect(screen.getByText("10:00")).toBeInTheDocument();
  });

  it("verify button is disabled with incomplete code", async () => {
    const user = userEvent.setup();
    renderOtpPage(`/q/${TOKEN}/otp`);
    await waitFor(() => {
      expect(screen.getByLabelText("Digit 1")).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText("Digit 1"), "1");
    await user.type(screen.getByLabelText("Digit 2"), "2");
    await user.type(screen.getByLabelText("Digit 3"), "3");
    // Button should still be disabled since not all 6 digits are filled
    expect(screen.getByRole("button", { name: /Verify & access form/ })).toBeDisabled();
  });

  it("verifies OTP successfully", async () => {
    mockVerifyOtp.mockResolvedValue({ sessionToken: "new-session-token" });
    const user = userEvent.setup();
    renderOtpPage(`/q/${TOKEN}/otp`);
    await waitFor(() => {
      expect(screen.getByLabelText("Digit 1")).toBeInTheDocument();
    });
    for (let i = 1; i <= 6; i++) {
      await user.type(screen.getByLabelText(`Digit ${i}`), String(i));
    }
    await user.click(screen.getByRole("button", { name: /Verify & access form/ }));
    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith(TOKEN, "123456");
    });
  });

  it("shows error on failed OTP verification", async () => {
    mockVerifyOtp.mockRejectedValue(new Error("Invalid code"));
    const user = userEvent.setup();
    renderOtpPage(`/q/${TOKEN}/otp`);
    await waitFor(() => {
      expect(screen.getByLabelText("Digit 1")).toBeInTheDocument();
    });
    for (let i = 1; i <= 6; i++) {
      await user.type(screen.getByLabelText(`Digit ${i}`), String(i));
    }
    await user.click(screen.getByRole("button", { name: /Verify & access form/ }));
    await waitFor(() => {
      expect(screen.getByText(/Invalid code/)).toBeInTheDocument();
    });
  });

  it("shows error on resend failure", async () => {
    mockRequestOtp.mockRejectedValue(new Error("Failed"));
    const user = userEvent.setup();
    renderOtpPage(`/q/${TOKEN}/otp`);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Resend code/ })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Resend code/ }));
    await waitFor(() => {
      expect(mockRequestOtp).toHaveBeenCalled();
    });
  });

  it("resends OTP code successfully", async () => {
    mockRequestOtp.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderOtpPage(`/q/${TOKEN}/otp`);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Resend code/ })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Resend code/ }));
    await waitFor(() => {
      expect(mockRequestOtp).toHaveBeenCalledWith(TOKEN);
    });
  });

  it("verify button is disabled when digits are incomplete", async () => {
    renderOtpPage(`/q/${TOKEN}/otp`);
    await waitFor(() => {
      expect(screen.getByLabelText("Digit 1")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Verify & access form/ })).toBeDisabled();
  });

  it("renders security notice", async () => {
    renderOtpPage(`/q/${TOKEN}/otp`);
    await waitFor(() => {
      expect(screen.getByText(/This link is unique/)).toBeInTheDocument();
    });
  });

  it("redirects when session is missing from storage", async () => {
    sessionStorage.clear();
    renderOtpPage(`/q/${TOKEN}/otp`);
    await waitFor(() => {
      expect(screen.getByText("Landing")).toBeInTheDocument();
    });
  });

  it("redirects to landing if session storage is corrupt", async () => {
    sessionStorage.setItem(`q_session_${TOKEN}`, "not-json");
    renderOtpPage(`/q/${TOKEN}/otp`);
    await waitFor(() => {
      expect(screen.getByText("Landing")).toBeInTheDocument();
    });
  });

  it("shows error after first failed attempt", async () => {
    // mock is set at the top level
    const user = userEvent.setup();
    renderOtpPage(`/q/${TOKEN}/otp`);
    await waitFor(() => {
      expect(screen.getByLabelText("Digit 1")).toBeInTheDocument();
    });
    for (let i = 1; i <= 6; i++) {
      await user.type(screen.getByLabelText(`Digit ${i}`), String(i));
    }
    await user.click(screen.getByRole("button", { name: /Verify & access form/ }));
    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalled();
    });
  });

  it("shows 'attempt(s) remaining' text after failed attempt", async () => {
    mockVerifyOtp.mockRejectedValue(new Error("Invalid code"));
    const user = userEvent.setup();
    renderOtpPage(`/q/${TOKEN}/otp`);
    await waitFor(() => {
      expect(screen.getByLabelText("Digit 1")).toBeInTheDocument();
    });
    for (let i = 1; i <= 6; i++) {
      await user.type(screen.getByLabelText(`Digit ${i}`), String(i));
    }
    await user.click(screen.getByRole("button", { name: /Verify & access form/ }));
    await waitFor(() => {
      expect(screen.getByText(/attempt/)).toBeInTheDocument();
    });
  });

  it("falls back to default email when maskedEmail missing", async () => {
    sessionStorage.setItem(`q_session_${TOKEN}`, JSON.stringify({
      caseId: "case-1",
      subjectName: "Test Co",
      recipientType: "Supplier",
    }));
    renderOtpPage(`/q/${TOKEN}/otp`);
    await waitFor(() => {
      expect(screen.getByText(/your registered email/)).toBeInTheDocument();
    });
  });

  it("displays the timer color for different remaining seconds", async () => {
    renderOtpPage(`/q/${TOKEN}/otp`);
    await waitFor(() => {
      expect(screen.getByText("10:00")).toBeInTheDocument();
    });
  });

  it("renders the verify form heading", async () => {
    renderOtpPage(`/q/${TOKEN}/otp`);
    await waitFor(() => {
      expect(screen.getByText(/sent a 6-digit code/)).toBeInTheDocument();
    });
  });

  it("renders the 'Didn't receive the code' prompt", async () => {
    renderOtpPage(`/q/${TOKEN}/otp`);
    await waitFor(() => {
      expect(screen.getByText(/Didn't receive the code/)).toBeInTheDocument();
    });
  });

  it("shows error when verify is clicked with incomplete digits", async () => {
    const user = userEvent.setup();
    renderOtpPage(`/q/${TOKEN}/otp`);
    await waitFor(() => {
      expect(screen.getByLabelText("Digit 1")).toBeInTheDocument();
    });
    // Fill only 4 digits
    for (let i = 1; i <= 4; i++) {
      await user.type(screen.getByLabelText(`Digit ${i}`), String(i));
    }
    // Click verify
    await user.click(screen.getByRole("button", { name: /Verify & access form/ }));
    // Should still be on the OTP page
    expect(screen.getByText("Verify your identity")).toBeInTheDocument();
  });

  it("locks after 3 failed attempts and clears digits", async () => {
    mockVerifyOtp.mockReset();
    mockVerifyOtp.mockRejectedValue(new Error("Invalid code"));
    const user = userEvent.setup();
    renderOtpPage(`/q/${TOKEN}/otp`);
    await waitFor(() => {
      expect(screen.getByLabelText("Digit 1")).toBeInTheDocument();
    });

    for (let attempt = 1; attempt <= 3; attempt++) {
      for (let i = 1; i <= 6; i++) {
        const input = screen.getByLabelText(`Digit ${i}`);
        await user.clear(input);
        await user.type(input, String(i));
      }
      await user.click(screen.getByRole("button", { name: /Verify & access form/ }));
      await waitFor(() => {
        expect(mockVerifyOtp).toHaveBeenCalledTimes(attempt);
      });
    }

    await waitFor(() => {
      expect(
        screen.getByText(/Too many incorrect attempts\. Please request a new code\./),
      ).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Digit 1")).toHaveValue("");
    expect(screen.getByRole("button", { name: /Verify & access form/ })).toBeDisabled();
  });
});
