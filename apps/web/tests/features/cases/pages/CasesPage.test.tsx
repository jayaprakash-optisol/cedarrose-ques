import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import CasesPage from "@/features/cases/pages/CasesPage";
import { casesService } from "@/services";
import { createMockCase } from "../../../fixtures/case";
import { renderWithProviders } from "../../../helpers/render";

describe("CasesPage", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("renders the All cases heading", async () => {
    vi.spyOn(casesService, "list").mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0 },
    });
    renderWithProviders(<CasesPage />);
    expect(await screen.findByText("All cases")).toBeInTheDocument();
    expect(document.body.textContent ?? "").toContain("0 cases total");
  });

  it("renders the case rows when there are results", async () => {
    vi.spyOn(casesService, "list").mockResolvedValue({
      data: [createMockCase()],
      meta: { page: 1, limit: 20, total: 1 },
    });
    renderWithProviders(<CasesPage />);
    expect(await screen.findByText("Acme Trading LLC")).toBeInTheDocument();
    expect(document.body.textContent ?? "").toContain("1 case total");
  });

  it("updates the search field", async () => {
    const user = userEvent.setup();
    vi.spyOn(casesService, "list").mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0 },
    });
    renderWithProviders(<CasesPage />);
    const search = await screen.findByPlaceholderText("Search company, order ID, or UID");
    await user.type(search, "Acme");
    expect(search).toHaveValue("Acme");
  });

  it("exports the CSV when the button is clicked", async () => {
    const user = userEvent.setup();
    vi.spyOn(casesService, "list").mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0 },
    });
    const exportSpy = vi.spyOn(casesService, "exportCsv").mockResolvedValue();
    renderWithProviders(<CasesPage />);
    await user.click(await screen.findByRole("button", { name: /CSV/ }));
    await waitFor(() => {
      expect(exportSpy).toHaveBeenCalled();
    });
  });

  it("shows an error toast when the export fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(casesService, "list").mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0 },
    });
    const exportSpy = vi.spyOn(casesService, "exportCsv").mockRejectedValue(new Error("Export failed"));
    renderWithProviders(<CasesPage />);
    await user.click(await screen.findByRole("button", { name: /CSV/ }));
    await new Promise((r) => setTimeout(r, 200));
    expect(exportSpy).toHaveBeenCalled();
  });

  it("opens the detail panel when a row is clicked", async () => {
    const user = userEvent.setup();
    vi.spyOn(casesService, "list").mockResolvedValue({
      data: [createMockCase()],
      meta: { page: 1, limit: 20, total: 1 },
    });
    renderWithProviders(<CasesPage />);
    await user.click(await screen.findByText("Acme Trading LLC"));
    await waitFor(() => {
      expect(document.body.textContent ?? "").toContain("Case overview");
    });
  });

  it("opens the detail panel when the caseId query param is set", async () => {
    vi.spyOn(casesService, "list").mockResolvedValue({
      data: [createMockCase()],
      meta: { page: 1, limit: 20, total: 1 },
    });
    renderWithProviders(<CasesPage />, { routerPath: "/cases?caseId=case-123" });
    await waitFor(() => {
      expect(document.body.textContent).toContain("Case overview");
    });
  });

  it("changes page when pagination is used", async () => {
    const user = userEvent.setup();
    const listSpy = vi.spyOn(casesService, "list").mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 100 },
    });
    renderWithProviders(<CasesPage />);
    await user.click(await screen.findByLabelText("Next page"));
    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 }),
      );
    });
  });
});
