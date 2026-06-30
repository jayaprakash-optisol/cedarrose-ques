import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuditLogPage from "@/features/audit-log/pages/AuditLogPage";
import { renderWithRouter } from "../../../helpers/render-with-router";
import { mockCases } from "../../../helpers/mock-case";

const mocks = vi.hoisted(() => ({
  listAudit: vi.fn(),
  listCases: vi.fn(),
}));

vi.mock("@/components/layout/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/services", () => ({
  auditService: { list: mocks.listAudit },
  casesService: { list: mocks.listCases },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn() },
}));

const auditEvents = [
  {
    id: "e-1",
    caseId: "c-test",
    timestamp: "2026-06-24T10:00:00.000Z",
    step: 1,
    type: "Link Event" as const,
    description: "Secure link dispatched",
    triggeredBy: "System",
    status: "Success" as const,
  },
  {
    id: "e-2",
    caseId: "c-test",
    timestamp: "2026-06-24T09:00:00.000Z",
    step: 2,
    type: "Authentication" as const,
    description: "OTP verified",
    triggeredBy: "Subject",
    status: "Failed" as const,
  },
  {
    id: "e-3",
    caseId: "c-other",
    timestamp: "2026-06-23T09:00:00.000Z",
    step: 3,
    type: "API Call" as const,
    description: "Order created",
    triggeredBy: "System",
    status: "Pending" as const,
  },
];

describe("AuditLogPage", () => {
  beforeEach(() => {
    mocks.listAudit.mockResolvedValue(auditEvents);
    mocks.listCases.mockResolvedValue(mockCases);
  });

  it("renders audit log table", async () => {
    renderWithRouter(<AuditLogPage />);

    expect(screen.getByRole("heading", { name: /audit log/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/secure link dispatched/i)).toBeInTheDocument();
    });
  });

  it("expands row to show workflow timeline", async () => {
    const user = userEvent.setup();

    renderWithRouter(<AuditLogPage />);
    await waitFor(() => {
      expect(screen.getByText(/secure link dispatched/i)).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole("button", { name: /expand row/i })[0]);
    expect(screen.getByText(/step 1\./i)).toBeInTheDocument();
  });

  it("collapses expanded row", async () => {
    const user = userEvent.setup();
    renderWithRouter(<AuditLogPage />);
    await waitFor(() => {
      expect(screen.getByText(/secure link dispatched/i)).toBeInTheDocument();
    });

    const expandBtn = screen.getAllByRole("button", { name: /expand row/i })[0];
    await user.click(expandBtn);
    await user.click(screen.getByRole("button", { name: /collapse row/i }));
  });

  it("filters by search query", async () => {
    const user = userEvent.setup();
    renderWithRouter(<AuditLogPage />);
    await waitFor(() => {
      expect(screen.getByText(/secure link dispatched/i)).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText(/search subject or order id/i), "ORD-10002");
    await waitFor(() => {
      expect(screen.queryByText(/secure link dispatched/i)).not.toBeInTheDocument();
    });
  });

  it("filters by event type", async () => {
    const user = userEvent.setup();
    renderWithRouter(<AuditLogPage />);
    await waitFor(() => {
      expect(screen.getByText(/secure link dispatched/i)).toBeInTheDocument();
    });

    const typeSelect = screen.getAllByRole("combobox")[0];
    await user.click(typeSelect);
    await user.click(await screen.findByRole("option", { name: /authentication/i }));

    await waitFor(() => {
      expect(screen.getByText(/otp verified/i)).toBeInTheDocument();
      expect(screen.queryByText(/order created/i)).not.toBeInTheDocument();
    });
  });

  it("exports csv", async () => {
    const user = userEvent.setup();
    renderWithRouter(<AuditLogPage />);
    await waitFor(() => {
      expect(screen.getByText(/secure link dispatched/i)).toBeInTheDocument();
    });

    const createUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:audit");
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    await user.click(screen.getByRole("button", { name: /export csv/i }));

    const { toast } = await import("sonner");
    expect(createUrl).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalled();
    createUrl.mockRestore();
    revoke.mockRestore();
  });

  it("shows empty state when no events match filters", async () => {
    const user = userEvent.setup();
    renderWithRouter(<AuditLogPage />);
    await waitFor(() => {
      expect(screen.getByText(/secure link dispatched/i)).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText(/search subject or order id/i), "zzzz-no-match");
    await waitFor(() => {
      expect(screen.getByText(/no events match the current filters/i)).toBeInTheDocument();
    });
  });

  it("filters by caseId from search params", async () => {
    renderWithRouter(<AuditLogPage />, {
      routerProps: { initialEntries: ["/audit-log?caseId=c-other"] },
    });

    await waitFor(() => {
      expect(screen.getByText(/filtered by case/i)).toBeInTheDocument();
      expect(screen.getByText(/order created/i)).toBeInTheDocument();
      expect(screen.queryByText(/secure link dispatched/i)).not.toBeInTheDocument();
    });
  });
});
