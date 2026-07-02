import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewRequestPage from "@/features/new-request/pages/NewRequestPage";
import { renderWithProviders } from "../../../helpers/render";

const { mockListPending, mockGetById, mockCreate, mockListTemplates, mockGetTemplate } = vi.hoisted(() => ({
  mockListPending: vi.fn(),
  mockGetById: vi.fn(),
  mockCreate: vi.fn(),
  mockListTemplates: vi.fn(),
  mockGetTemplate: vi.fn(),
}));

vi.mock("@/services", () => {
  const noop = vi.fn(() => Promise.resolve(undefined));
  const noopResolved = vi.fn().mockResolvedValue(undefined);
  const noopList = vi.fn().mockResolvedValue([]);
  return {
    companyRequestsService: { listPending: mockListPending, getById: mockGetById },
    casesService: { list: noopList, getById: noop, create: mockCreate, exportCsv: noop, resendLink: noopResolved },
    templatesService: { list: mockListTemplates, getById: mockGetTemplate, create: noop, save: noop, updateStatus: noop, delete: noopResolved, saveAll: noop },
    auditService: { list: noopList, exportCsv: noop },
    notificationsService: { list: noopList, markRead: noopResolved, markAllRead: noopResolved, save: noopResolved },
    authService: { login: noop, logout: noopResolved, getCurrentUser: noop },
    settingsService: { get: noop, save: noop, changePassword: noopResolved },
    usersService: { list: noopList, save: noop },
    configService: { get: noop, save: noop },
    dashboardService: { getCompletionStats: noop },
    questionnaireService: { verifyLink: noop, requestOtp: noopResolved, verifyOtp: noop, getForm: noop, saveProgress: noopResolved, submit: noopResolved },
  };
});

const PENDING_REQUESTS = [
  {
    companyRequestId: "cr-1",
    orderId: "ORD-10001",
    externalRef: "UID-44529",
    companyName: "Acme Trading LLC",
    country: "UAE",
    riskRating: "Low",
    recipientType: "Supplier",
    receivedAt: "2026-01-01T00:00:00Z",
    status: "Pending",
  },
];

const COMPANY_DATA = {
  companyName: "Acme Trading",
  registrationNumber: "CR-100",
  country: "UAE",
  riskRating: "Low",
  recipientEmails: ["ops@acme.example"],
  additionalFields: { incorporationDate: "2018-04-01", legalStructure: "LLC", primaryIndustry: "Trading" },
};

describe("NewRequestPage", () => {
  beforeEach(() => {
    HTMLElement.prototype.hasPointerCapture = vi.fn();
    HTMLElement.prototype.setPointerCapture = vi.fn();
    mockListPending.mockResolvedValue(PENDING_REQUESTS);
    mockGetById.mockResolvedValue(COMPANY_DATA);
    mockListTemplates.mockResolvedValue([
      { id: "tpl-1", name: "Supplier Template", recipientType: "Supplier", status: "Active" },
    ]);
    mockGetTemplate.mockResolvedValue({
      id: "tpl-1", name: "Supplier Template",
      sections: [{ id: "s1", number: 1, title: "Section 1", questions: [{ id: "q1", text: "Q1", type: "text", required: true, prefill: false }] }],
    });
    mockCreate.mockResolvedValue({ id: "case-1", linkUrl: "https://example.com/q/abc" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the heading", () => {
    renderWithProviders(<NewRequestPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    expect(screen.getByText("New questionnaire request")).toBeInTheDocument();
    expect(screen.getByText(/Workflow steps/)).toBeInTheDocument();
  });

  it("renders the stepper", () => {
    renderWithProviders(<NewRequestPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    expect(screen.getByText("Select request")).toBeInTheDocument();
    expect(screen.getByText("Review & configure")).toBeInTheDocument();
    expect(screen.getByText("Confirm & send")).toBeInTheDocument();
  });

  it("renders step A form with pending requests", async () => {
    renderWithProviders(<NewRequestPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    await waitFor(() => {
      expect(screen.getByText("Step A — Select incoming company request")).toBeInTheDocument();
      expect(screen.getByText("Acme Trading LLC")).toBeInTheDocument();
    });
  });

  it("shows empty state when no pending requests", async () => {
    mockListPending.mockResolvedValue([]);
    renderWithProviders(<NewRequestPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    await waitFor(() => {
      expect(screen.getByText(/No pending company requests/)).toBeInTheDocument();
    });
  });

  it("sends the link after selecting a request", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewRequestPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    await waitFor(() => {
      expect(screen.getByText("Acme Trading LLC")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Acme Trading LLC"));
    await waitFor(() => {
      expect(screen.getByText("Confirm & send")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Confirm & send link/ }));
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: "ORD-10001",
          companyRequestId: "cr-1",
          subjectName: "Acme Trading",
          country: "UAE",
          recipientEmail: "ops@acme.example",
        }),
      );
    });
  });

  it("shows step C on successful send", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewRequestPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    await waitFor(() => {
      expect(screen.getByText("Acme Trading LLC")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Acme Trading LLC"));
    await waitFor(() => {
      expect(screen.getByText("Confirm & send")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Confirm & send link/ }));
    await waitFor(() => {
      expect(screen.getByText("Secure link sent")).toBeInTheDocument();
    });
  });

  it("shows questionnaire link when created", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewRequestPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    await waitFor(() => {
      expect(screen.getByText("Acme Trading LLC")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Acme Trading LLC"));
    await waitFor(() => {
      expect(screen.getByText("Confirm & send")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Confirm & send link/ }));
    await waitFor(() => {
      expect(screen.getByText("Questionnaire link")).toBeInTheDocument();
      expect(screen.getByText("https://example.com/q/abc")).toBeInTheDocument();
    });
  });

  it("navigates back from step B to step A", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewRequestPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    await waitFor(() => {
      expect(screen.getByText("Acme Trading LLC")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Acme Trading LLC"));
    await waitFor(() => {
      expect(screen.getByText("Confirm & send")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Back/ }));
    await waitFor(() => {
      expect(screen.getByText("Step A — Select incoming company request")).toBeInTheDocument();
    });
  });

  it("triggers another request from step C", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewRequestPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    await waitFor(() => {
      expect(screen.getByText("Acme Trading LLC")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Acme Trading LLC"));
    await waitFor(() => {
      expect(screen.getByText("Confirm & send")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Confirm & send link/ }));
    await waitFor(() => {
      expect(screen.getByText("Secure link sent")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Trigger another request/ }));
    await waitFor(() => {
      expect(screen.getByText("Step A — Select incoming company request")).toBeInTheDocument();
    });
  });

  it("handles send failure", async () => {
    mockCreate.mockRejectedValue(new Error("Send failed"));
    const user = userEvent.setup();
    renderWithProviders(<NewRequestPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    await waitFor(() => {
      expect(screen.getByText("Acme Trading LLC")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Acme Trading LLC"));
    await waitFor(() => {
      expect(screen.getByText("Confirm & send")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Confirm & send link/ }));
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
    });
  });

  it("shows company data in step B", async () => {
    renderWithProviders(<NewRequestPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    await waitFor(() => {
      expect(screen.getByText("Acme Trading LLC")).toBeInTheDocument();
    });
    const user = userEvent.setup();
    await user.click(screen.getByText("Acme Trading LLC"));
    await waitFor(() => {
      expect(screen.getByText("Acme Trading")).toBeInTheDocument();
      expect(screen.getByText("CR-100")).toBeInTheDocument();
      expect(screen.getByText("UAE")).toBeInTheDocument();
    });
  });

  it("shows no template warning when no active template", async () => {
    mockListTemplates.mockResolvedValue([]);
    renderWithProviders(<NewRequestPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    await waitFor(() => {
      expect(screen.getByText("Acme Trading LLC")).toBeInTheDocument();
    });
    const user = userEvent.setup();
    await user.click(screen.getByText("Acme Trading LLC"));
    await waitFor(() => {
      expect(screen.getByText(/No active questionnaire template/)).toBeInTheDocument();
    });
  });

  it("renders template preview collapsible", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewRequestPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    await waitFor(() => {
      expect(screen.getByText("Acme Trading LLC")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Acme Trading LLC"));
    await waitFor(() => {
      expect(screen.getByText("Confirm & send")).toBeInTheDocument();
    });
    const previewBtn = screen.getByText(/Preview Supplier template/);
    await user.click(previewBtn);
    await waitFor(() => {
      expect(screen.getByText("Q1")).toBeInTheDocument();
    });
  });

  it("shows View case in All Cases link", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewRequestPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    await waitFor(() => {
      expect(screen.getByText("Acme Trading LLC")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Acme Trading LLC"));
    await waitFor(() => {
      expect(screen.getByText("Confirm & send")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Confirm & send link/ }));
    await waitFor(() => {
      expect(screen.getByText("View case in All Cases")).toBeInTheDocument();
    });
  });

  it("renders recipient type radio options", async () => {
    renderWithProviders(<NewRequestPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    await waitFor(() => {
      expect(screen.getByText("Acme Trading LLC")).toBeInTheDocument();
    });
    const user = userEvent.setup();
    await user.click(screen.getByText("Acme Trading LLC"));
    await waitFor(() => {
      expect(screen.getByText("Confirm & send")).toBeInTheDocument();
    });
    expect(screen.getAllByText("Supplier").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Customer").length).toBeGreaterThanOrEqual(1);
  });
});
