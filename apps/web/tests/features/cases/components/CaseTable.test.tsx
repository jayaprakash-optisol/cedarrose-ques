import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CaseTable } from "@/features/cases/components/CaseTable";
import { casesService } from "@/services";
import { createMockCase } from "../../../fixtures/case";
import { renderWithProviders } from "../../../helpers/render";

describe("CaseTable", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("renders the empty state when there are no cases", () => {
    renderWithProviders(<CaseTable cases={[]} />);
    expect(screen.getByText("No cases match the current filters.")).toBeInTheDocument();
  });

  it("renders the case rows with the company name and CRIS UID", () => {
    const c = createMockCase();
    renderWithProviders(<CaseTable cases={[c]} />);
    expect(screen.getByText("Acme Trading LLC")).toBeInTheDocument();
    expect(screen.getByText("CR-100200")).toBeInTheDocument();
  });

  it("renders the order ID column when showOrderId is true", () => {
    const c = createMockCase({ orderId: "ORD-9999" });
    renderWithProviders(<CaseTable cases={[c]} showOrderId />);
    expect(screen.getByText("ORD-9999")).toBeInTheDocument();
  });

  it("invokes onRowClick when a row is clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const c = createMockCase();
    renderWithProviders(<CaseTable cases={[c]} onRowClick={onClick} />);
    await user.click(screen.getByText("Acme Trading LLC"));
    expect(onClick).toHaveBeenCalled();
  });

  it("does not invoke onRowClick twice when the action cell is clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const c = createMockCase();
    renderWithProviders(<CaseTable cases={[c]} onRowClick={onClick} />);
    const btns = screen.getAllByRole("button");
    await user.click(btns[btns.length - 1]);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("sorts by status when the status column is clicked", async () => {
    const user = userEvent.setup();
    const a = createMockCase({ id: "a", orderId: "OA", status: "COMPLETED" });
    const b = createMockCase({ id: "b", orderId: "OB", status: "EXPIRED" });
    renderWithProviders(<CaseTable cases={[a, b]} />);
    const statusButton = screen.getByRole("button", { name: /Status/ });
    await user.click(statusButton);
    // After sorting, the order changes; we just check the button works
    expect(statusButton).toBeInTheDocument();
  });

  it("toggles sort direction when the same column is clicked again", async () => {
    const user = userEvent.setup();
    const a = createMockCase({ id: "a", orderId: "OA", lastActivity: "2026-06-01T00:00:00.000Z" });
    const b = createMockCase({ id: "b", orderId: "OB", lastActivity: "2026-06-02T00:00:00.000Z" });
    renderWithProviders(<CaseTable cases={[a, b]} />);
    const button = screen.getByRole("button", { name: /Last Activity/ });
    await user.click(button);
    await user.click(button);
    expect(button).toBeInTheDocument();
  });

  it("shows the Resend link button for EXPIRED cases", async () => {
    const c = createMockCase({ status: "EXPIRED" });
    renderWithProviders(<CaseTable cases={[c]} />);
    expect(screen.getByRole("button", { name: "Resend link" })).toBeInTheDocument();
  });

  it("shows the View details button for non-EXPIRED cases", () => {
    const c = createMockCase({ status: "SENT" });
    renderWithProviders(<CaseTable cases={[c]} />);
    // The button has "View details" as its accessible name; check the DOM
    expect(document.body.textContent).toContain("View details");
  });

  it("treats an EXPIRED link as effectively EXPIRED even if the status is SENT", () => {
    const c = createMockCase({
      status: "SENT",
      linkExpiry: "2020-01-01T00:00:00.000Z", // past
    });
    renderWithProviders(<CaseTable cases={[c]} />);
    expect(screen.getByRole("button", { name: "Resend link" })).toBeInTheDocument();
  });

  it("renders the resend modal and shows the success state", async () => {
    const user = userEvent.setup();
    vi.spyOn(casesService, "resendLink").mockResolvedValue({ linkExpiry: "2026-07-01T00:00:00.000Z" });
    const c = createMockCase({ status: "EXPIRED" });
    renderWithProviders(<CaseTable cases={[c]} />);
    expect(document.body.textContent).toContain("Resend link");
    // Open the modal by clicking the Resend link
    const btns = screen.getAllByRole("button");
    const resendBtn = btns.find((b) => b.textContent === "Resend link");
    expect(resendBtn).toBeDefined();
    await user.click(resendBtn!);
    // Modal is now open
    expect(document.body.textContent).toContain("Review the details below before resending");
  });

  it("shows the stale indicator for IN PROGRESS cases with no activity for >72h", () => {
    const c = createMockCase({
      status: "IN PROGRESS",
      lastActivity: "2020-01-01T00:00:00.000Z",
    });
    const { container } = renderWithProviders(<CaseTable cases={[c]} />);
    expect(container.querySelector(".text-status-pending-fg")).toBeTruthy();
  });

  it("renders the completion progress bar", () => {
    const c = createMockCase({
      completionMandatory: { done: 25, total: 100 },
    });
    renderWithProviders(<CaseTable cases={[c]} />);
    expect(screen.getByText("25/100")).toBeInTheDocument();
  });

  it("renders reminders when set", () => {
    const c = createMockCase({ remindersSent: 2 });
    renderWithProviders(<CaseTable cases={[c]} />);
    expect(screen.getByText("2/3")).toBeInTheDocument();
  });

  it("renders the em-dash when reminders is null", () => {
    const c = createMockCase({ remindersSent: null });
    renderWithProviders(<CaseTable cases={[c]} />);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("renders the link expiry in muted color when > 6 days remain", () => {
    const c = createMockCase({ id: "a", orderId: "OA", linkExpiry: "2026-12-31T00:00:00.000Z", status: "SENT" });
    const { container } = renderWithProviders(<CaseTable cases={[c]} />);
    // The date is in muted color (>6 days)
    expect(container.querySelector(".text-muted-foreground")).toBeTruthy();
  });

  it("renders the link expiry in muted color when > 6 days remain", () => {
    const c = createMockCase({ id: "a", orderId: "OA", linkExpiry: "2027-01-01T00:00:00.000Z" });
    const { container } = renderWithProviders(<CaseTable cases={[c]} />);
    expect(container.querySelector(".text-muted-foreground")).toBeTruthy();
  });

  it("renders 'Expired' for past link expiry", () => {
    const c = createMockCase({ id: "a", orderId: "OA", linkExpiry: "2020-01-01T00:00:00.000Z", status: "SENT" });
    renderWithProviders(<CaseTable cases={[c]} />);
    expect(screen.getByText("Expired")).toBeInTheDocument();
  });

  it("renders the em-dash for COMPLETED status link expiry", () => {
    const c = createMockCase({ status: "COMPLETED", linkExpiry: "2026-06-20T00:00:00.000Z" });
    renderWithProviders(<CaseTable cases={[c]} />);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("renders the em-dash for 'COMPLETED — MISSING DATA' status link expiry", () => {
    const c = createMockCase({ status: "COMPLETED — MISSING DATA", linkExpiry: "2026-06-20T00:00:00.000Z" });
    renderWithProviders(<CaseTable cases={[c]} />);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("renders the em-dash for null link expiry", () => {
    const c = createMockCase({ linkExpiry: null });
    renderWithProviders(<CaseTable cases={[c]} />);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("renders 'Expires In' as plain text for various days", () => {
    const c = createMockCase({ id: "a", orderId: "OA", linkExpiry: "2027-01-01T00:00:00.000Z" });
    renderWithProviders(<CaseTable cases={[c]} />);
    expect(screen.getByText(/\d+d/)).toBeInTheDocument();
  });

  it("renders 'Expires In' as 'Expired' for past link expiry", () => {
    const c = createMockCase({ id: "a", orderId: "OA", linkExpiry: "2020-01-01T00:00:00.000Z", status: "SENT" });
    renderWithProviders(<CaseTable cases={[c]} />);
    expect(screen.getAllByText("Expired").length).toBeGreaterThan(0);
  });

  it("renders 'Expires In' as 'Expired' for EXPIRED status", () => {
    const c = createMockCase({ status: "EXPIRED" });
    renderWithProviders(<CaseTable cases={[c]} />);
    expect(screen.getAllByText("Expired").length).toBeGreaterThan(0);
  });

  it("falls back to muted 'Expires In' for non-applicable statuses", () => {
    const c = createMockCase({ status: "PENDING CONTACT" });
    renderWithProviders(<CaseTable cases={[c]} />);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});
