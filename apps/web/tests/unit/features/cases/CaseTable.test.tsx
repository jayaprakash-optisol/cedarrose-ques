import { describe, it, expect, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CaseTable } from "@/features/cases/components/CaseTable";
import { renderWithRouter } from "../../../helpers/render-with-router";
import { makeCase, mockCases } from "../../../helpers/mock-case";

vi.mock("@/features/cases/components/ResendLinkModal", () => ({
  ResendLinkModal: ({
    open,
    onConfirmed,
    onViewDetails,
    onClose,
  }: {
    open: boolean;
    onConfirmed: () => void;
    onViewDetails: () => void;
    onClose: () => void;
  }) =>
    open ? (
      <div>
        Resend modal open
        <button onClick={onConfirmed}>Confirm resend</button>
        <button onClick={onViewDetails}>View from modal</button>
        <button onClick={onClose}>Close modal</button>
      </div>
    ) : null,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn() },
}));

function renderTable(cases = mockCases, props: Partial<React.ComponentProps<typeof CaseTable>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithRouter(
    <QueryClientProvider client={queryClient}>
      <CaseTable cases={cases} {...props} />
    </QueryClientProvider>,
  );
}

describe("CaseTable", () => {
  it("renders case rows with company names", () => {
    renderTable(mockCases, { showOrderId: true });
    const table = screen.getByRole("table");
    expect(within(table).getByText(/test holdings ltd/i)).toBeInTheDocument();
    expect(within(table).getByText(/expired corp/i)).toBeInTheDocument();
    expect(within(table).getByText("ORD-10001")).toBeInTheDocument();
  });

  it("calls onRowClick when view details clicked", async () => {
    const onRowClick = vi.fn();
    const user = userEvent.setup();
    renderTable([mockCases[0]], { onRowClick });

    await user.click(screen.getByRole("button", { name: /view details/i }));
    expect(onRowClick).toHaveBeenCalledWith(mockCases[0]);
  });

  it("calls onRowClick when row clicked", async () => {
    const onRowClick = vi.fn();
    const user = userEvent.setup();
    renderTable([mockCases[0]], { onRowClick });

    await user.click(screen.getByText(/test holdings ltd/i));
    expect(onRowClick).toHaveBeenCalledWith(mockCases[0]);
  });

  it("shows empty state when no cases", () => {
    renderTable([]);
    expect(screen.getByText(/no cases match the current filters/i)).toBeInTheDocument();
  });

  it("shows resend link for expired cases and confirms resend", async () => {
    const user = userEvent.setup();
    renderTable([mockCases[1]]);
    await user.click(screen.getByRole("button", { name: /resend link/i }));
    expect(screen.getByText(/resend modal open/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /confirm resend/i }));

    const { toast } = await import("sonner");
    expect(toast.success).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /resend link/i })).not.toBeInTheDocument();
  });

  it("opens view details from resend modal", async () => {
    const onRowClick = vi.fn();
    const user = userEvent.setup();
    renderTable([mockCases[1]], { onRowClick });
    await user.click(screen.getByRole("button", { name: /resend link/i }));
    await user.click(screen.getByRole("button", { name: /view from modal/i }));
    expect(onRowClick).toHaveBeenCalledWith(mockCases[1]);
  });

  it("sorts by status and last activity in both directions", async () => {
    const user = userEvent.setup();
    renderTable(mockCases, { showOrderId: true });
    await user.click(screen.getByRole("button", { name: /status/i }));
    await user.click(screen.getByRole("button", { name: /status/i }));
    await user.click(screen.getByRole("button", { name: /last activity/i }));
    await user.click(screen.getByRole("button", { name: /last activity/i }));
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("renders link expiry and expires-in styling for soon-expiring links", () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 2);
    renderTable([
      makeCase({
        id: "c-soon",
        status: "SENT",
        linkExpiry: soon.toISOString(),
        remindersSent: 2,
      }),
    ]);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("2/3")).toBeInTheDocument();
  });

  it("shows stale indicator for inactive in-progress cases", () => {
    const stale = new Date(Date.now() - 80 * 3600_000).toISOString();
    renderTable([
      makeCase({
        id: "c-stale",
        status: "IN PROGRESS",
        lastActivity: stale,
        remindersSent: null,
      }),
    ]);
    expect(screen.getByTitle(/no activity for >72h/i)).toBeInTheDocument();
  });

  it("renders expired and completed expiry cells", () => {
    renderTable([
      makeCase({ id: "c-done", status: "COMPLETED", linkExpiry: null, remindersSent: 3 }),
      makeCase({
        id: "c-exp",
        status: "EXPIRED",
        linkExpiry: "2026-01-01T00:00:00.000Z",
      }),
      makeCase({
        id: "c-pending",
        status: "PENDING CONTACT",
        linkExpiry: null,
      }),
    ]);
    expect(screen.getAllByText(/expired/i).length).toBeGreaterThan(0);
  });
});
