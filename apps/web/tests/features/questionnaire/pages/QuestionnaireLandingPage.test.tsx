import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import QuestionnaireLandingPage from "@/features/questionnaire/pages/QuestionnaireLandingPage";
import { makeQueryClient } from "../../../helpers/render";
import { TooltipProvider } from "@/components/ui/tooltip";

const { mockVerifyLink, mockRequestOtp } = vi.hoisted(() => ({
  mockVerifyLink: vi.fn(),
  mockRequestOtp: vi.fn(),
}));

vi.mock("@/services", () => {
  const noop = vi.fn(() => Promise.resolve(undefined));
  const noopResolved = vi.fn().mockResolvedValue(undefined);
  const noopList = vi.fn().mockResolvedValue([]);
  return {
    questionnaireService: { verifyLink: mockVerifyLink, requestOtp: mockRequestOtp, verifyOtp: noop, getForm: noop, saveProgress: noopResolved, submit: noopResolved },
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

const TOKEN = "link-token-abc";

function renderLandingPage(path: string) {
  const qc = makeQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider delayDuration={0}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/q/:token" element={<QuestionnaireLandingPage />} />
            <Route path="/q/:token/otp" element={<div>OTP Page</div>} />
            <Route path="/q/:token/form" element={<div>Form Page</div>} />
            <Route path="/q/:token/expired" element={<div>Expired Page</div>} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe("QuestionnaireLandingPage", () => {
  beforeEach(() => { sessionStorage.clear(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it("shows verifying state while loading", () => {
    mockVerifyLink.mockReturnValue(new Promise(() => {}));
    renderLandingPage(`/q/${TOKEN}`);
    expect(screen.getByText(/Verifying your secure link/)).toBeInTheDocument();
  });

  it("verifies link and shows landing content", async () => {
    mockVerifyLink.mockResolvedValue({
      caseId: "case-1", subjectName: "Test Co", recipientType: "Supplier", maskedEmail: "t***@e.com",
    });
    renderLandingPage(`/q/${TOKEN}`);
    await waitFor(() => {
      expect(screen.getByText("Credit Information Request")).toBeInTheDocument();
    });
  });

  it("redirects to expired page on verification failure", async () => {
    mockVerifyLink.mockRejectedValue(new Error("Invalid link"));
    renderLandingPage(`/q/${TOKEN}`);
    await waitFor(() => {
      expect(screen.getByText("Expired Page")).toBeInTheDocument();
    });
  });

  it("redirects to form if session already exists", async () => {
    sessionStorage.setItem(`q_session_${TOKEN}`, JSON.stringify({
      caseId: "case-1", subjectName: "Test", recipientType: "Supplier", maskedEmail: "t@e.com",
      sessionToken: "existing-token",
    }));
    renderLandingPage(`/q/${TOKEN}`);
    await waitFor(() => {
      expect(screen.getByText("Form Page")).toBeInTheDocument();
    });
  });

  it("sends OTP and navigates to OTP page", async () => {
    mockVerifyLink.mockResolvedValue({
      caseId: "case-1", subjectName: "Test Co", recipientType: "Supplier", maskedEmail: "t***@e.com",
    });
    mockRequestOtp.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderLandingPage(`/q/${TOKEN}`);
    await waitFor(() => {
      expect(screen.getByText("Send verification code")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Send verification code/ }));
    await waitFor(() => {
      expect(screen.getByText("OTP Page")).toBeInTheDocument();
    });
  });

  it("renders security notice", async () => {
    mockVerifyLink.mockResolvedValue({
      caseId: "case-1", subjectName: "Test Co", recipientType: "Supplier", maskedEmail: "t***@e.com",
    });
    renderLandingPage(`/q/${TOKEN}`);
    await waitFor(() => {
      expect(screen.getByText(/This form is secured/)).toBeInTheDocument();
    });
  });

  it("renders tagline", async () => {
    mockVerifyLink.mockResolvedValue({
      caseId: "case-1", subjectName: "Test Co", recipientType: "Supplier", maskedEmail: "t***@e.com",
    });
    renderLandingPage(`/q/${TOKEN}`);
    await waitFor(() => {
      expect(screen.getByText(/Data You Can Trust/)).toBeInTheDocument();
    });
  });

  it("handles corrupted session storage", async () => {
    sessionStorage.setItem(`q_session_${TOKEN}`, "not-json");
    mockVerifyLink.mockResolvedValue({
      caseId: "case-1", subjectName: "Test Co", recipientType: "Supplier", maskedEmail: "t***@e.com",
    });
    renderLandingPage(`/q/${TOKEN}`);
    await waitFor(() => {
      expect(screen.getByText("Credit Information Request")).toBeInTheDocument();
    });
  });
});
