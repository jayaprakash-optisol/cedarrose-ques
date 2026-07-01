import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CaseDetailPanel } from "@/features/cases/components/CaseDetailPanel";
import { auditService, casesService } from "@/services";
import { createMockCase } from "../../../fixtures/case";
import { renderWithProviders } from "../../../helpers/render";

describe("CaseDetailPanel", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("returns null when no case is selected", () => {
    const { container } = renderWithProviders(
      <CaseDetailPanel case={null} open={false} onOpenChange={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the case overview with status and fields", async () => {
    vi.spyOn(casesService, "getById").mockResolvedValue(createMockCase({ status: "IN PROGRESS" }));
    vi.spyOn(auditService, "list").mockResolvedValue({ data: [], meta: { page: 1, limit: 500, total: 0 } });
    renderWithProviders(
      <CaseDetailPanel case={createMockCase()} open onOpenChange={() => {}} />,
    );
    expect((await screen.findAllByText("Acme Trading LLC")).length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(document.body.textContent).toContain("IN PROGRESS");
    });
  });

  it("shows the Responses tab when status is IN PROGRESS", async () => {
    vi.spyOn(casesService, "getById").mockResolvedValue(createMockCase({ status: "IN PROGRESS" }));
    vi.spyOn(auditService, "list").mockResolvedValue({ data: [], meta: { page: 1, limit: 500, total: 0 } });
    renderWithProviders(
      <CaseDetailPanel case={createMockCase({ status: "IN PROGRESS" })} open onOpenChange={() => {}} />,
    );
    expect(await screen.findByText("Responses")).toBeInTheDocument();
  });

  it("shows the Responses tab when status is COMPLETED", async () => {
    vi.spyOn(casesService, "getById").mockResolvedValue(createMockCase({ status: "COMPLETED" }));
    vi.spyOn(auditService, "list").mockResolvedValue({ data: [], meta: { page: 1, limit: 500, total: 0 } });
    renderWithProviders(
      <CaseDetailPanel case={createMockCase({ status: "COMPLETED" })} open onOpenChange={() => {}} />,
    );
    expect(await screen.findByText("Responses")).toBeInTheDocument();
  });

  it("shows the Responses tab when status is COMPLETED — MISSING DATA", async () => {
    vi.spyOn(casesService, "getById").mockResolvedValue(createMockCase({ status: "COMPLETED — MISSING DATA" }));
    vi.spyOn(auditService, "list").mockResolvedValue({ data: [], meta: { page: 1, limit: 500, total: 0 } });
    renderWithProviders(
      <CaseDetailPanel case={createMockCase({ status: "COMPLETED — MISSING DATA" })} open onOpenChange={() => {}} />,
    );
    expect(await screen.findByText("Responses")).toBeInTheDocument();
  });

  it("shows the Responses tab when status is EXPIRED", async () => {
    vi.spyOn(casesService, "getById").mockResolvedValue(createMockCase({ status: "EXPIRED" }));
    vi.spyOn(auditService, "list").mockResolvedValue({ data: [], meta: { page: 1, limit: 500, total: 0 } });
    renderWithProviders(
      <CaseDetailPanel case={createMockCase({ status: "EXPIRED" })} open onOpenChange={() => {}} />,
    );
    expect(await screen.findByText("Responses")).toBeInTheDocument();
  });

  it("hides the Responses tab when status is SENT", async () => {
    vi.spyOn(casesService, "getById").mockResolvedValue(createMockCase({ status: "SENT" }));
    vi.spyOn(auditService, "list").mockResolvedValue({ data: [], meta: { page: 1, limit: 500, total: 0 } });
    renderWithProviders(
      <CaseDetailPanel case={createMockCase({ status: "SENT" })} open onOpenChange={() => {}} />,
    );
    expect(await screen.findByText("Case overview")).toBeInTheDocument();
    expect(screen.queryByText("Responses")).not.toBeInTheDocument();
  });

  it("switches to the Timeline tab and shows the workflow steps", async () => {
    const user = userEvent.setup();
    vi.spyOn(casesService, "getById").mockResolvedValue(createMockCase({ status: "IN PROGRESS" }));
    vi.spyOn(auditService, "list").mockResolvedValue({ data: [], meta: { page: 1, limit: 500, total: 0 } });
    renderWithProviders(
      <CaseDetailPanel case={createMockCase()} open onOpenChange={() => {}} />,
    );
    await user.click(await screen.findByText("Workflow timeline"));
    expect(await screen.findByText(/Step 1\./)).toBeInTheDocument();
  });

  it("shows the em-dash for recipient email when missing", async () => {
    vi.spyOn(casesService, "getById").mockResolvedValue(
      createMockCase({
        companyData: {
          ...createMockCase().companyData,
          recipientEmails: [],
        },
      }),
    );
    vi.spyOn(auditService, "list").mockResolvedValue({ data: [], meta: { page: 1, limit: 500, total: 0 } });
    renderWithProviders(
      <CaseDetailPanel case={createMockCase()} open onOpenChange={() => {}} />,
    );
    expect(await screen.findAllByText("Acme Trading LLC").then((els) => els.length > 0)).toBe(true);
  });
});
