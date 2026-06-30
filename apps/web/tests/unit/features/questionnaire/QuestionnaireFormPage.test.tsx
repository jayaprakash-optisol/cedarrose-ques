import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Routes, Route } from "react-router-dom";
import QuestionnaireFormPage from "@/features/questionnaire/pages/QuestionnaireFormPage";
import { renderWithRouter } from "../../../helpers/render-with-router";

const mocks = vi.hoisted(() => ({
  getForm: vi.fn(),
  saveProgress: vi.fn(),
  submit: vi.fn(),
}));

vi.mock("@/services", () => ({
  questionnaireService: {
    getForm: mocks.getForm,
    saveProgress: mocks.saveProgress,
    submit: mocks.submit,
  },
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const formData = {
  case: {
    caseId: "c-001",
    subjectName: "Acme Trading LLC",
    recipientType: "Supplier" as const,
    status: "IN PROGRESS",
    currentStep: 1,
  },
  template: {
    id: "tpl-1",
    name: "Standard",
    sections: [
      {
        id: "sec-1",
        number: 1,
        title: "Company Info",
        description: "Basic details",
        questions: [
          { id: "q1", text: "Legal name", type: "text" as const, required: true },
          { id: "q2", text: "Notes", type: "text" as const, required: false },
        ],
      },
      {
        id: "sec-2",
        number: 2,
        title: "Contacts",
        questions: [
          { id: "q3", text: "Email", type: "text" as const, required: true },
        ],
      },
    ],
  },
  savedResponses: [],
};

function seedSession(token = "tok-1") {
  sessionStorage.setItem(
    `q_session_${token}`,
    JSON.stringify({ sessionToken: "sess-1", savedAt: new Date().toISOString() }),
  );
}

function renderPage(token = "tok-1") {
  return renderWithRouter(
    <Routes>
      <Route path="/q/:token/form" element={<QuestionnaireFormPage />} />
      <Route path="/q/:token" element={<div>Landing</div>} />
      <Route path="/q/:token/otp" element={<div>OTP</div>} />
    </Routes>,
    { routerProps: { initialEntries: [`/q/${token}/form`] } },
  );
}

describe("QuestionnaireFormPage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    mocks.getForm.mockReset();
    mocks.saveProgress.mockReset();
    mocks.submit.mockReset();
    mocks.getForm.mockResolvedValue(formData);
    mocks.saveProgress.mockResolvedValue(undefined);
    mocks.submit.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("redirects without session", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Landing")).toBeInTheDocument();
    });
  });

  it("loads form and advances sections", async () => {
    seedSession();
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /section 1 · company info/i })).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText(/enter legal name/i), "Acme LLC");
    await user.click(screen.getByRole("button", { name: /save & continue/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /section 2 · contacts/i })).toBeInTheDocument();
    });
  });

  it("submits questionnaire on final section", async () => {
    seedSession();
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/enter legal name/i)).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText(/enter legal name/i), "Acme LLC");
    await user.click(screen.getByRole("button", { name: /save & continue/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/enter email/i)).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText(/enter email/i), "a@acme.com");
    await user.click(screen.getByRole("button", { name: /submit questionnaire/i }));

    await waitFor(() => {
      expect(screen.getByText(/questionnaire submitted/i)).toBeInTheDocument();
    });
    expect(mocks.submit).toHaveBeenCalledWith("tok-1", "sess-1");
  });

  it("shows validation error when required fields missing", async () => {
    seedSession();
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save & continue/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /save & continue/i }));
    const { toast } = await import("sonner");
    expect(toast.error).toHaveBeenCalled();
  });

  it("restores saved responses banner", async () => {
    seedSession();
    mocks.getForm.mockResolvedValue({
      ...formData,
      savedResponses: [{ questionId: "q1", sectionId: "sec-1", question: "Legal name", answer: "Saved Co", mandatory: true }],
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    });
  });

  it("redirects to otp when session token missing", async () => {
    sessionStorage.setItem("q_session_tok-1", JSON.stringify({ savedAt: new Date().toISOString() }));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("OTP")).toBeInTheDocument();
    });
  });

  it("redirects on corrupt session storage", async () => {
    sessionStorage.setItem("q_session_tok-1", "not-json");
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Landing")).toBeInTheDocument();
    });
  });

  it("shows load error toast", async () => {
    seedSession();
    mocks.getForm.mockRejectedValue(new Error("fail"));
    renderPage();
    const { toast } = await import("sonner");
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it("dismisses restored banner and uses debounced save", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    seedSession();
    mocks.getForm.mockResolvedValue({
      ...formData,
      savedResponses: [{ questionId: "q1", sectionId: "sec-1", question: "Legal name", answer: "Saved Co", mandatory: true }],
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    });
    await user.click(document.querySelector("svg.lucide-x")!.closest("button")!);

    await user.type(screen.getByDisplayValue("Saved Co"), " Updated");
    await vi.advanceTimersByTimeAsync(2000);
    expect(mocks.saveProgress).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("navigates sections and handles submit failure", async () => {
    seedSession();
    mocks.submit.mockRejectedValue(new Error("fail"));
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/enter legal name/i)).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText(/enter legal name/i), "Acme LLC");
    await user.click(screen.getByRole("button", { name: /save & continue/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/enter email/i)).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText(/enter email/i), "a@acme.com");
    await user.click(screen.getByRole("button", { name: /submit questionnaire/i }));

    const { toast } = await import("sonner");
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });
});
