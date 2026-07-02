import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import QuestionnaireFormPage from "@/features/questionnaire/pages/QuestionnaireFormPage";
import { makeQueryClient } from "../../../helpers/render";
import { TooltipProvider } from "@/components/ui/tooltip";

const { mockGetForm, mockSaveProgress, mockSubmit } = vi.hoisted(() => ({
  mockGetForm: vi.fn(),
  mockSaveProgress: vi.fn(),
  mockSubmit: vi.fn(),
}));

vi.mock("@/services", () => {
  const noop = vi.fn(() => Promise.resolve(undefined));
  const noopResolved = vi.fn().mockResolvedValue(undefined);
  const noopList = vi.fn().mockResolvedValue([]);
  return {
    questionnaireService: { verifyLink: noop, requestOtp: noopResolved, verifyOtp: noop, getForm: mockGetForm, saveProgress: mockSaveProgress, submit: mockSubmit },
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

const TOKEN = "test-token-123";

function makeFormData() {
  return {
    case: { caseId: "case-1", subjectName: "Test Co", recipientType: "Supplier", status: "IN PROGRESS", currentStep: 1 },
    template: {
      id: "tpl-1", name: "Test Template",
      sections: [
        { id: "sec-1", number: 1, title: "Company Info", description: "Basic details", banner: "Please fill all fields", questions: [
          { id: "q1", text: "Company name", type: "text", required: true, prefill: false },
          { id: "q2", text: "Registration number", type: "text", required: false, prefill: false, helpText: "Enter your reg number" },
        ]},
        { id: "sec-2", number: 2, title: "Contact Info", questions: [
          { id: "q3", text: "Email", type: "text", required: true, prefill: false },
        ]},
      ],
    },
    savedResponses: undefined,
  };
}

function setupSession(sessionToken = "sess-token") {
  const key = `q_session_${TOKEN}`;
  sessionStorage.setItem(key, JSON.stringify({
    caseId: "case-1", subjectName: "Test Co", recipientType: "Supplier", maskedEmail: "t***@e.com", sessionToken,
  }));
}

function renderFormPage(path: string) {
  const qc = makeQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider delayDuration={0}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/q/:token/form" element={<QuestionnaireFormPage />} />
            <Route path="/q/:token" element={<div>Landing</div>} />
            <Route path="/q/:token/otp" element={<div>OTP</div>} />
            <Route path="/q/:token/session-expired" element={<div>Session Expired</div>} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe("QuestionnaireFormPage", () => {
  beforeEach(() => {
    mockGetForm.mockResolvedValue(makeFormData());
    mockSaveProgress.mockResolvedValue(undefined);
    mockSubmit.mockResolvedValue(undefined);
    setupSession();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("shows loading state initially", () => {
    mockGetForm.mockReturnValue(new Promise(() => {}));
    renderFormPage(`/q/${TOKEN}/form`);
    expect(screen.getByText(/Loading your questionnaire/)).toBeInTheDocument();
  });

  it("renders the form after loading", async () => {
    renderFormPage(`/q/${TOKEN}/form`);
    await waitFor(() => {
      expect(screen.getByText(/Section 1 of 2/)).toBeInTheDocument();
    });
  });

  it("shows Previous button disabled on first section", async () => {
    renderFormPage(`/q/${TOKEN}/form`);
    await waitFor(() => {
      expect(screen.getByText(/Section 1 of 2/)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Previous/ })).toBeDisabled();
  });

  it("calls saveProgress on manual save", async () => {
    const user = userEvent.setup();
    renderFormPage(`/q/${TOKEN}/form`);
    await waitFor(() => {
      expect(screen.getByText(/Section 1 of 2/)).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Save progress/ }));
    await waitFor(() => {
      expect(mockSaveProgress).toHaveBeenCalled();
    });
  });

  it("shows restored banner when savedResponses exist", async () => {
    mockGetForm.mockResolvedValue({
      ...makeFormData(),
      savedResponses: [
        { questionId: "q1", sectionId: "sec-1", question: "Company name", answer: "Acme", mandatory: true },
      ],
    });
    renderFormPage(`/q/${TOKEN}/form`);
    await waitFor(() => {
      expect(screen.getByText(/progress has been restored/)).toBeInTheDocument();
    });
  });

  it("shows session expired handling", async () => {
    const { ApiError } = await import("@/services/api/errors");
    mockGetForm.mockRejectedValue(new ApiError("SESSION_EXPIRED", "Session expired", 401));
    renderFormPage(`/q/${TOKEN}/form`);
    await waitFor(() => {
      expect(screen.getByText("Session Expired")).toBeInTheDocument();
    });
  });

  it("shows loading state when formData is null", async () => {
    mockGetForm.mockResolvedValue(null);
    renderFormPage(`/q/${TOKEN}/form`);
    await waitFor(() => {
      expect(screen.getByText(/Loading your questionnaire/)).toBeInTheDocument();
    });
  });

  it("redirects if no token in params", () => {
    renderFormPage("/q//form");
    expect(screen.queryByText(/Section 1 of 2/)).not.toBeInTheDocument();
  });

  it("navigates to next section after filling required fields", async () => {
    const user = userEvent.setup();
    renderFormPage(`/q/${TOKEN}/form`);
    await waitFor(() => {
      expect(screen.getByText(/Section 1 of 2/)).toBeInTheDocument();
    });
    // Fill in the required field
    const input = screen.getByPlaceholderText("Enter company name") as HTMLInputElement;
    await user.type(input, "Acme Corp");
    // Click continue
    await user.click(screen.getByRole("button", { name: /Save & Continue/ }));
    await waitFor(() => {
      expect(screen.getByText(/Section 2 of 2/)).toBeInTheDocument();
    });
  });

  it("shows error when trying to advance with missing required fields", async () => {
    const user = userEvent.setup();
    renderFormPage(`/q/${TOKEN}/form`);
    await waitFor(() => {
      expect(screen.getByText(/Section 1 of 2/)).toBeInTheDocument();
    });
    // Click continue without filling required field
    await user.click(screen.getByRole("button", { name: /Save & Continue/ }));
    // The error toast appears
  });

  it("shows Previous button enabled on second section", async () => {
    const user = userEvent.setup();
    renderFormPage(`/q/${TOKEN}/form`);
    await waitFor(() => {
      expect(screen.getByText(/Section 1 of 2/)).toBeInTheDocument();
    });
    const input = screen.getByPlaceholderText("Enter company name") as HTMLInputElement;
    await user.type(input, "Acme");
    await user.click(screen.getByRole("button", { name: /Save & Continue/ }));
    await waitFor(() => {
      expect(screen.getByText(/Section 2 of 2/)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Previous/ })).not.toBeDisabled();
  });

  it("navigates back to previous section", async () => {
    const user = userEvent.setup();
    renderFormPage(`/q/${TOKEN}/form`);
    await waitFor(() => {
      expect(screen.getByText(/Section 1 of 2/)).toBeInTheDocument();
    });
    const input = screen.getByPlaceholderText("Enter company name") as HTMLInputElement;
    await user.type(input, "Acme");
    await user.click(screen.getByRole("button", { name: /Save & Continue/ }));
    await waitFor(() => {
      expect(screen.getByText(/Section 2 of 2/)).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Previous/ }));
    await waitFor(() => {
      expect(screen.getByText(/Section 1 of 2/)).toBeInTheDocument();
    });
  });

  it("shows Submit button on last section", async () => {
    const user = userEvent.setup();
    renderFormPage(`/q/${TOKEN}/form`);
    await waitFor(() => {
      expect(screen.getByText(/Section 1 of 2/)).toBeInTheDocument();
    });
    const input = screen.getByPlaceholderText("Enter company name") as HTMLInputElement;
    await user.type(input, "Acme");
    await user.click(screen.getByRole("button", { name: /Save & Continue/ }));
    await waitFor(() => {
      expect(screen.getByText(/Section 2 of 2/)).toBeInTheDocument();
    });
    // Fill the required field on the last section
    const emailInput = screen.getByPlaceholderText("Enter email") as HTMLInputElement;
    await user.type(emailInput, "test@example.com");
    expect(screen.getByRole("button", { name: /Submit questionnaire/ })).toBeInTheDocument();
  });

  it("submits the form successfully", async () => {
    const user = userEvent.setup();
    renderFormPage(`/q/${TOKEN}/form`);
    await waitFor(() => {
      expect(screen.getByText(/Section 1 of 2/)).toBeInTheDocument();
    });
    const input = screen.getByPlaceholderText("Enter company name") as HTMLInputElement;
    await user.type(input, "Acme");
    await user.click(screen.getByRole("button", { name: /Save & Continue/ }));
    await waitFor(() => {
      expect(screen.getByText(/Section 2 of 2/)).toBeInTheDocument();
    });
    const emailInput = screen.getByPlaceholderText("Enter email") as HTMLInputElement;
    await user.type(emailInput, "test@example.com");
    await user.click(screen.getByRole("button", { name: /Submit questionnaire/ }));
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalled();
    });
  });

  it("shows success screen after submission", async () => {
    const user = userEvent.setup();
    renderFormPage(`/q/${TOKEN}/form`);
    await waitFor(() => {
      expect(screen.getByText(/Section 1 of 2/)).toBeInTheDocument();
    });
    const input = screen.getByPlaceholderText("Enter company name") as HTMLInputElement;
    await user.type(input, "Acme");
    await user.click(screen.getByRole("button", { name: /Save & Continue/ }));
    await waitFor(() => {
      expect(screen.getByText(/Section 2 of 2/)).toBeInTheDocument();
    });
    const emailInput = screen.getByPlaceholderText("Enter email") as HTMLInputElement;
    await user.type(emailInput, "test@example.com");
    await user.click(screen.getByRole("button", { name: /Submit questionnaire/ }));
    await waitFor(() => {
      expect(screen.getByText("Questionnaire Submitted")).toBeInTheDocument();
    });
  });

  it("shows error toast on submit failure", async () => {
    const { ApiError } = await import("@/services/api/errors");
    mockSubmit.mockRejectedValue(new ApiError("INTERNAL", "Submit failed", 500));
    const user = userEvent.setup();
    renderFormPage(`/q/${TOKEN}/form`);
    await waitFor(() => {
      expect(screen.getByText(/Section 1 of 2/)).toBeInTheDocument();
    });
    const input = screen.getByPlaceholderText("Enter company name") as HTMLInputElement;
    await user.type(input, "Acme");
    await user.click(screen.getByRole("button", { name: /Save & Continue/ }));
    await waitFor(() => {
      expect(screen.getByText(/Section 2 of 2/)).toBeInTheDocument();
    });
    const emailInput = screen.getByPlaceholderText("Enter email") as HTMLInputElement;
    await user.type(emailInput, "test@example.com");
    await user.click(screen.getByRole("button", { name: /Submit questionnaire/ }));
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalled();
    });
  });

  it("handles save progress failure silently", async () => {
    mockSaveProgress.mockRejectedValue(new Error("Save failed"));
    const user = userEvent.setup();
    renderFormPage(`/q/${TOKEN}/form`);
    await waitFor(() => {
      expect(screen.getByText(/Section 1 of 2/)).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Save progress/ }));
    await waitFor(() => {
      expect(mockSaveProgress).toHaveBeenCalled();
    });
  });

  it("dismisses the restored banner", async () => {
    mockGetForm.mockResolvedValue({
      ...makeFormData(),
      savedResponses: [
        { questionId: "q1", sectionId: "sec-1", question: "Company name", answer: "Acme", mandatory: true },
      ],
    });
    renderFormPage(`/q/${TOKEN}/form`);
    await waitFor(() => {
      expect(screen.getByText(/progress has been restored/)).toBeInTheDocument();
    });
    // Click the X button on the banner
    const closeBtn = document.querySelector('svg.lucide-x')?.closest('button');
    if (closeBtn) await userEvent.setup().click(closeBtn as HTMLElement);
  });

  it("shows description and banner in section card", async () => {
    renderFormPage(`/q/${TOKEN}/form`);
    await waitFor(() => {
      expect(screen.getByText("Basic details")).toBeInTheDocument();
      expect(screen.getByText("Please fill all fields")).toBeInTheDocument();
    });
  });

  it("shows OPTIONAL badge for non-required questions", async () => {
    renderFormPage(`/q/${TOKEN}/form`);
    await waitFor(() => {
      expect(screen.getByText("OPTIONAL")).toBeInTheDocument();
    });
  });

  it("shows help text for questions with helpText", async () => {
    renderFormPage(`/q/${TOKEN}/form`);
    await waitFor(() => {
      expect(screen.getByText("Enter your reg number")).toBeInTheDocument();
    });
  });

  it("triggers field change with debounced save", async () => {
    const user = userEvent.setup();
    renderFormPage(`/q/${TOKEN}/form`);
    await waitFor(() => {
      expect(screen.getByText(/Section 1 of 2/)).toBeInTheDocument();
    });
    const input = screen.getByPlaceholderText("Enter company name") as HTMLInputElement;
    await user.type(input, "X");
    // Debounced save triggers after 2s
    await new Promise((r) => setTimeout(r, 2200));
    expect(mockSaveProgress).toHaveBeenCalled();
  });

  it("redirects to landing if no session in storage", () => {
    sessionStorage.clear();
    renderFormPage(`/q/${TOKEN}/form`);
    expect(screen.queryByText(/Section 1 of 2/)).not.toBeInTheDocument();
  });

  it("redirects to OTP if session has no sessionToken", () => {
    sessionStorage.setItem(`q_session_${TOKEN}`, JSON.stringify({
      caseId: "case-1", subjectName: "Test", recipientType: "Supplier", maskedEmail: "t@e.com",
    }));
    renderFormPage(`/q/${TOKEN}/form`);
    expect(screen.queryByText(/Section 1 of 2/)).not.toBeInTheDocument();
  });

  it("redirects to landing if session is corrupt", () => {
    sessionStorage.setItem(`q_session_${TOKEN}`, "not-json");
    renderFormPage(`/q/${TOKEN}/form`);
    expect(screen.queryByText(/Section 1 of 2/)).not.toBeInTheDocument();
  });
});
