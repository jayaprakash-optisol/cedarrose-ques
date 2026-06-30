import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import { renderWithRouter } from "../../../helpers/render-with-router";
import { makeCase, mockCases } from "../../../helpers/mock-case";

vi.mock("recharts", async () => {
  const React = await import("react");
  const Passthrough = ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "chart" }, children);
  return {
    ResponsiveContainer: Passthrough,
    BarChart: Passthrough,
    Bar: Passthrough,
    XAxis: Passthrough,
    YAxis: Passthrough,
    Tooltip: Passthrough,
    Cell: Passthrough,
    LineChart: Passthrough,
    Line: Passthrough,
    CartesianGrid: Passthrough,
    Legend: Passthrough,
    PieChart: Passthrough,
    Pie: Passthrough,
  };
});

const mocks = vi.hoisted(() => ({
  listCases: vi.fn(),
  getStats: vi.fn(),
}));

vi.mock("@/components/layout/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/services", () => ({
  casesService: { list: mocks.listCases },
  dashboardService: { getCompletionStats: mocks.getStats },
}));

const statsPayload = {
  period: "30d" as const,
  caseCount: 2,
  overallAvgDays: 5,
  expiredCapDays: 14,
  includesInProgress: true,
  summary: {
    avgTimeToFirstOpen: { value: 4, trend: -1 },
    avgTimeToComplete: { value: 3, trend: 0 },
    avgTotalTurnaround: { value: 7, trend: 2 },
  },
  byCompany: [
    {
      companyName: "Test Holdings Ltd",
      shortName: "Test",
      days: 5,
      state: "under" as const,
      status: "IN PROGRESS",
      dispatchedAt: "01 Jun 2026",
      endAt: "—",
    },
    {
      companyName: "Expired Corp",
      shortName: "Expired",
      days: 12,
      state: "expired" as const,
      status: "EXPIRED",
      dispatchedAt: "01 May 2026",
      endAt: "Expired",
    },
    {
      companyName: "Slow Corp",
      shortName: "Slow",
      days: 9,
      state: "over-progress" as const,
      status: "IN PROGRESS",
      dispatchedAt: "10 May 2026",
      endAt: "—",
    },
  ],
};

describe("DashboardPage", () => {
  it("renders overview metrics and charts", async () => {
    mocks.listCases.mockResolvedValue(mockCases);
    mocks.getStats.mockResolvedValue(statsPayload);

    renderWithRouter(<DashboardPage />);

    expect(screen.getByRole("heading", { name: /overview/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/total active cases/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /new request/i })).toHaveAttribute("href", "/new-request");
    expect(screen.getAllByTestId("chart").length).toBeGreaterThan(0);
  });

  it("switches response trend period tabs", async () => {
    mocks.listCases.mockResolvedValue(mockCases);
    mocks.getStats.mockResolvedValue(statsPayload);
    const user = userEvent.setup();

    renderWithRouter(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/response trends/i)).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole("button", { name: /^7 days$/i })[0]);
    await user.click(screen.getAllByRole("button", { name: /^all time$/i })[0]);
    await user.click(screen.getAllByRole("button", { name: /^30 days$/i })[0]);
    expect(screen.getAllByTestId("chart").length).toBeGreaterThan(0);
  });

  it("switches average completion time period tabs", async () => {
    mocks.listCases.mockResolvedValue(mockCases);
    mocks.getStats.mockResolvedValue(statsPayload);
    const user = userEvent.setup();

    renderWithRouter(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/average completion time/i)).toBeInTheDocument();
    });

    const sevenDayBtns = screen.getAllByRole("button", { name: /7 days/i });
    await user.click(sevenDayBtns[sevenDayBtns.length - 1]);
    await waitFor(() => {
      expect(mocks.getStats).toHaveBeenCalledWith("7d");
    });

    const allTimeBtns = screen.getAllByRole("button", { name: /all time/i });
    await user.click(allTimeBtns[allTimeBtns.length - 1]);
    await waitFor(() => {
      expect(mocks.getStats).toHaveBeenCalledWith("all");
    });
  });

  it("shows loading state for completion stats", async () => {
    mocks.listCases.mockResolvedValue([]);
    mocks.getStats.mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/loading completion stats/i)).toBeInTheDocument();
    });
  });

  it("shows error state for completion stats", async () => {
    mocks.listCases.mockResolvedValue([]);
    mocks.getStats.mockRejectedValue(new Error("fail"));

    renderWithRouter(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/could not load completion stats/i)).toBeInTheDocument();
    });
  });

  it("computes needs attention including stale in-progress cases", async () => {
    const staleDate = new Date(Date.now() - 80 * 3600_000).toISOString();
    mocks.listCases.mockResolvedValue([
      makeCase({ status: "IN PROGRESS", lastActivity: staleDate }),
      makeCase({ id: "c-pending", status: "PENDING CONTACT" }),
      makeCase({ id: "c-done", status: "COMPLETED" }),
    ]);
    mocks.getStats.mockResolvedValue({ ...statsPayload, byCompany: [] });

    renderWithRouter(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/needs attention/i)).toBeInTheDocument();
    });
  });

  it("renders empty company bars message", async () => {
    mocks.listCases.mockResolvedValue(mockCases);
    mocks.getStats.mockResolvedValue({ ...statsPayload, byCompany: [] });

    renderWithRouter(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/no dispatched cases in this period/i)).toBeInTheDocument();
    });
  });

  it("links to audit log from completion section", async () => {
    mocks.listCases.mockResolvedValue(mockCases);
    mocks.getStats.mockResolvedValue(statsPayload);

    renderWithRouter(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /view full audit log/i })).toHaveAttribute("href", "/audit-log");
    });
  });
});
