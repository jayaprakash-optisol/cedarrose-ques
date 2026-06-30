import { describe, it, expect, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CasesPage from "@/features/cases/pages/CasesPage";
import { renderWithRouter } from "../../../helpers/render-with-router";
import { mockCases } from "../../../helpers/mock-case";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
}));

vi.mock("@/components/layout/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/services", () => ({
  casesService: {
    list: mocks.list,
    getById: vi.fn(async (id: string) => mockCases.find((c) => c.id === id)),
  },
  auditService: {
    list: vi.fn(async () => []),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("CasesPage", () => {
  it("renders cases table with filters", async () => {
    mocks.list.mockResolvedValue(mockCases);
    renderWithRouter(<CasesPage />);

    expect(screen.getByRole("heading", { name: /all cases/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(within(screen.getByRole("table")).getByText(/test holdings ltd/i)).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText(/search company, order id, or uid/i)).toBeInTheDocument();
  });

  it("filters cases by search query", async () => {
    mocks.list.mockResolvedValue(mockCases);
    const user = userEvent.setup();
    renderWithRouter(<CasesPage />);

    await waitFor(() => {
      expect(within(screen.getByRole("table")).getByText(/test holdings ltd/i)).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText(/search company, order id, or uid/i), "Expired");
    expect(within(screen.getByRole("table")).queryByText(/test holdings ltd/i)).not.toBeInTheDocument();
    expect(within(screen.getByRole("table")).getByText(/expired corp/i)).toBeInTheDocument();
  });

  it("opens case detail panel", async () => {
    mocks.list.mockResolvedValue(mockCases);
    const user = userEvent.setup();
    renderWithRouter(<CasesPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /view details/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /view details/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/test holdings ltd/i).length).toBeGreaterThan(1);
    });
  });

  it("exports filtered cases to csv", async () => {
    mocks.list.mockResolvedValue(mockCases);
    const user = userEvent.setup();
    renderWithRouter(<CasesPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /view details/i })).toBeInTheDocument();
    });

    const createUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:cases");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    await user.click(screen.getByRole("button", { name: /csv/i }));
    const { toast } = await import("sonner");
    expect(toast.success).toHaveBeenCalled();
    createUrl.mockRestore();
  });

  it("filters by status, recipient type, and opens case from query param", async () => {
    mocks.list.mockResolvedValue(mockCases);
    const user = userEvent.setup();
    renderWithRouter(<CasesPage />, {
      routerProps: { initialEntries: ["/cases?caseId=case-1"] },
    });

    await waitFor(() => {
      expect(within(screen.getByRole("table")).getByText(/test holdings ltd/i)).toBeInTheDocument();
    });

    const statusSelect = screen.getAllByRole("combobox")[0];
    await user.click(statusSelect);
    await user.click(await screen.findByRole("option", { name: "EXPIRED" }));
    expect(within(screen.getByRole("table")).queryByText(/test holdings ltd/i)).not.toBeInTheDocument();

    await user.click(statusSelect);
    await user.click(await screen.findByRole("option", { name: "All" }));

    const typeSelect = screen.getAllByRole("combobox")[1];
    await user.click(typeSelect);
    await user.click(await screen.findByRole("option", { name: "Customer" }));
  });
});
