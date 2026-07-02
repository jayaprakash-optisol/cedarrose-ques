import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuditLogPage from "@/features/audit-log/pages/AuditLogPage";
import { auditService, casesService } from "@/services";
import { renderWithProviders } from "../../../helpers/render";
import type { AuditEvent } from "@/types/audit";

vi.mock("@/hooks/useDebouncedValue", () => ({
  useDebouncedValue: (v: string) => v,
}));

function makeEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: "evt-1",
    timestamp: "2026-06-01T10:00:00.000Z",
    caseId: "case-1",
    caseSubject: "Acme Corp",
    caseOrderId: "ORD-001",
    step: 1,
    type: "Link Event",
    description: "Link sent",
    triggeredBy: "admin@cr.com",
    status: "Success",
    caseStatus: "SENT",
    ...overrides,
  };
}

describe("AuditLogPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auditService, "list").mockResolvedValue({ data: [], meta: { page: 1, limit: 25, total: 0 } });
    vi.spyOn(auditService, "exportCsv").mockResolvedValue(undefined);
    vi.spyOn(casesService, "getById").mockResolvedValue(null as any);
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it("renders the heading", async () => {
    renderWithProviders(<AuditLogPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    expect(screen.getByText("Audit log")).toBeInTheDocument();
  });

  it("shows empty state when no events", async () => {
    renderWithProviders(<AuditLogPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    await waitFor(() => {
      expect(screen.getByText("No events match the current filters.")).toBeInTheDocument();
    });
  });

  it("shows 'filtered by case' when caseId is in search params", async () => {
    renderWithProviders(<AuditLogPage />, {
      authValue: { isAuthenticated: true, isAdmin: true },
      routerPath: "/audit-log?caseId=case-100",
    });
    await waitFor(() => {
      expect(screen.getByText(/filtered by case/)).toBeInTheDocument();
    });
  });

  it("renders search input", async () => {
    renderWithProviders(<AuditLogPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    expect(screen.getByPlaceholderText("Search subject or order ID")).toBeInTheDocument();
  });

  it("renders date filter fields", async () => {
    renderWithProviders(<AuditLogPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    expect(screen.getByText("From date")).toBeInTheDocument();
    expect(screen.getByText("To date")).toBeInTheDocument();
  });

  it("exports CSV", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AuditLogPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    await waitFor(() => {
      expect(screen.getByText("No events match the current filters.")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Export CSV/ }));
    await waitFor(() => {
      expect(auditService.exportCsv).toHaveBeenCalled();
    });
  });

  it("shows event type filter", async () => {
    renderWithProviders(<AuditLogPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    expect(screen.getByText("Event type")).toBeInTheDocument();
  });

  it("renders events with subject and order ID", async () => {
    vi.spyOn(auditService, "list").mockResolvedValue({
      data: [makeEvent()],
      meta: { page: 1, limit: 25, total: 1 },
    });
    renderWithProviders(<AuditLogPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      expect(screen.getByText("ORD-001")).toBeInTheDocument();
    });
  });

  it("shows singular 'case' when total is 1", async () => {
    vi.spyOn(auditService, "list").mockResolvedValue({
      data: [makeEvent()],
      meta: { page: 1, limit: 25, total: 1 },
    });
    renderWithProviders(<AuditLogPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    await waitFor(() => {
      expect(screen.getByText(/1 case/)).toBeInTheDocument();
    });
  });

  it("shows 'Loading…' while fetching", async () => {
    let resolveFn: any;
    vi.spyOn(auditService, "list").mockReturnValue(new Promise((r) => { resolveFn = r; }) as any);
    renderWithProviders(<AuditLogPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    expect(screen.getByText(/Loading…/)).toBeInTheDocument();
    resolveFn({ data: [], meta: { page: 1, limit: 25, total: 0 } });
  });

  it("expands a row on click", async () => {
    vi.spyOn(auditService, "list").mockImplementation((params: any) => {
      if (params?.grouped) {
        return Promise.resolve({
          data: [makeEvent()],
          meta: { page: 1, limit: 25, total: 1 },
        });
      }
      return Promise.resolve({
        data: [makeEvent()],
        meta: { page: 1, limit: 500, total: 1 },
      });
    });
    vi.spyOn(casesService, "getById").mockResolvedValue({
      id: "case-1", orderId: "ORD-001", uid: "CR-001",
      subjectName: "Acme Corp", country: "UAE",
      recipientType: "Supplier", status: "SENT",
      completionMandatory: { done: 0, total: 100 },
      completionOptional: { done: 0, total: 100 },
      requestedDate: "2026-06-01T00:00:00.000Z",
      lastActivity: "2026-06-01T00:00:00.000Z",
      researcherStatus: "Not Applicable",
      companyData: {
        companyName: "Acme Corp",
        registrationNumber: "CR-001",
        country: "UAE",
        riskRating: "Low",
        recipientEmails: ["a@b.com"],
        additionalFields: { incorporationDate: "2018-01-01", legalStructure: "LLC", primaryIndustry: "X" },
      },
      link: { sentAt: "2026-06-01", firstOpenedAt: undefined, expiresAt: "2026-06-08", resentCount: 0 },
      responses: [],
      currentStep: 1,
      analyst: "Analyst X",
      linkExpiry: "2026-06-08T00:00:00.000Z",
      linkValidityHours: 48,
      remindersSent: 0,
      stepTimestamps: undefined,
      linkUrl: null,
    } as any);
    renderWithProviders(<AuditLogPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });
    const expandBtn = screen.getAllByLabelText(/Expand row/)[0];
    await userEvent.setup().click(expandBtn);
    await waitFor(() => {
      expect(screen.getAllByText(/Step 1/).length).toBeGreaterThan(0);
    });
  });

  it("collapses a row when clicked twice", async () => {
    vi.spyOn(auditService, "list").mockResolvedValue({
      data: [makeEvent()],
      meta: { page: 1, limit: 25, total: 1 },
    });
    renderWithProviders(<AuditLogPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });
    const expandBtn = screen.getAllByLabelText(/Expand row/)[0];
    const user = userEvent.setup();
    await user.click(expandBtn);
    const collapseBtn = screen.getByLabelText(/Collapse row/);
    await user.click(collapseBtn);
  });

  it("shows case status badge in the table", async () => {
    vi.spyOn(auditService, "list").mockResolvedValue({
      data: [makeEvent({ caseStatus: "SENT" })],
      meta: { page: 1, limit: 25, total: 1 },
    });
    renderWithProviders(<AuditLogPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    await waitFor(() => {
      expect(screen.getAllByText("SENT").length).toBeGreaterThan(0);
    });
  });

  it("shows em-dash when case status is missing", async () => {
    vi.spyOn(auditService, "list").mockResolvedValue({
      data: [makeEvent({ caseStatus: undefined })],
      meta: { page: 1, limit: 25, total: 1 },
    });
    renderWithProviders(<AuditLogPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    await waitFor(() => {
      expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    });
  });

  it("handles CSV export error", async () => {
    vi.spyOn(auditService, "exportCsv").mockRejectedValue(new Error("Export failed"));
    const user = userEvent.setup();
    renderWithProviders(<AuditLogPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    await waitFor(() => {
      expect(screen.getByText("No events match the current filters.")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Export CSV/ }));
    await waitFor(() => {
      expect(auditService.exportCsv).toHaveBeenCalled();
    });
  });

  it("handles orphan events (no caseId)", async () => {
    vi.spyOn(auditService, "list").mockResolvedValue({
      data: [makeEvent({ id: "orphan-1", caseId: "", caseSubject: "—", caseOrderId: "" })],
      meta: { page: 1, limit: 25, total: 1 },
    });
    renderWithProviders(<AuditLogPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    await waitFor(() => {
      expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    });
  });
});
