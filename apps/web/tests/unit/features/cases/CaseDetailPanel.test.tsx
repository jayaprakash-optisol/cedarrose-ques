import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { CaseDetailPanel } from "@/features/cases/components/CaseDetailPanel";
import { renderWithRouter } from "../../../helpers/render-with-router";
import { makeCase } from "../../../helpers/mock-case";

const mocks = vi.hoisted(() => ({
  getById: vi.fn(),
  listAudit: vi.fn(),
}));

vi.mock("@/services", () => ({
  casesService: { getById: mocks.getById },
  auditService: { list: mocks.listAudit },
}));

describe("CaseDetailPanel", () => {
  const selected = makeCase({ status: "IN PROGRESS" });

  it("renders case overview when open", async () => {
    mocks.getById.mockResolvedValue(selected);
    mocks.listAudit.mockResolvedValue([]);

    renderWithRouter(
      <CaseDetailPanel case={selected} open onOpenChange={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /case overview/i })).toBeInTheDocument();
    });
    expect(screen.getAllByText(/test holdings ltd/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/company data/i)).toBeInTheDocument();
  });

  it("returns null when no case selected", () => {
    const { container } = renderWithRouter(
      <CaseDetailPanel case={null} open={false} onOpenChange={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
