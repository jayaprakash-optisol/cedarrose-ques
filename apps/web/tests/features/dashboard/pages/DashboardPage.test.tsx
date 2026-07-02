import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import { renderWithProviders } from "../../../helpers/render";

const { mockListCases, mockGetCompletionStats } = vi.hoisted(() => ({
  mockListCases: vi.fn(),
  mockGetCompletionStats: vi.fn(),
}));

vi.mock("@/services", () => {
  const noop = vi.fn(() => Promise.resolve(undefined));
  const noopResolved = vi.fn().mockResolvedValue(undefined);
  const noopList = vi.fn().mockResolvedValue([]);
  return {
    casesService: { list: mockListCases, getById: noop, create: noop, exportCsv: noop, resendLink: noopResolved },
    dashboardService: { getCompletionStats: mockGetCompletionStats },
    auditService: { list: noopList, exportCsv: noop },
    notificationsService: { list: noopList, markRead: noopResolved, markAllRead: noopResolved, save: noopResolved },
    authService: { login: noop, logout: noopResolved, getCurrentUser: noop },
    settingsService: { get: noop, save: noop, changePassword: noopResolved },
    companiesService: { getByUid: noop },
    usersService: { list: noopList, save: noop },
    templatesService: { list: noopList, getById: noop, create: noop, save: noop, updateStatus: noop, delete: noopResolved, saveAll: noop },
    configService: { get: noop, save: noop },
    questionnaireService: { verifyLink: noop, requestOtp: noopResolved, verifyOtp: noop, getForm: noop, saveProgress: noopResolved, submit: noopResolved },
  };
});

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Cell: () => null,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  CartesianGrid: () => null,
  Legend: () => null,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
}));

describe("DashboardPage", () => {
  beforeEach(() => {
    mockListCases.mockResolvedValue({
      data: [
        { id: "c1", status: "COMPLETED", recipientType: "Supplier", completionMandatory: { done: 10, total: 10 }, completionOptional: { done: 5, total: 10 }, lastActivity: new Date().toISOString() },
        { id: "c2", status: "IN PROGRESS", recipientType: "Customer", completionMandatory: { done: 5, total: 10 }, completionOptional: { done: 2, total: 5 }, lastActivity: new Date().toISOString() },
      ],
      meta: { page: 1, limit: 100, total: 2 },
    });
    mockGetCompletionStats.mockResolvedValue({
      overallAvgDays: 5.2,
      caseCount: 2,
      includesInProgress: false,
      expiredCapDays: 7,
      summary: {
        avgTimeToFirstOpen: { value: 12.5, trend: 2.3 },
        avgTimeToComplete: { value: 3.5, trend: -1.2 },
        avgTotalTurnaround: { value: 5.2, trend: 0.8 },
      },
      byCompany: [
        { companyName: "Acme Corp", shortName: "Acme", days: 4.2, state: "under", status: "COMPLETED", dispatchedAt: "2026-06-01", endAt: "2026-06-05" },
      ],
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it("renders the overview heading", async () => {
    renderWithProviders(<DashboardPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    expect(screen.getAllByText("Overview").length).toBeGreaterThanOrEqual(1);
  });

  it("displays case metrics", async () => {
    renderWithProviders(<DashboardPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    expect(screen.getByText("Total active cases")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("renders response trends section", async () => {
    renderWithProviders(<DashboardPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    expect(screen.getByText("Response trends")).toBeInTheDocument();
  });

  it("renders status breakdown section", async () => {
    renderWithProviders(<DashboardPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    expect(screen.getByText("Status breakdown")).toBeInTheDocument();
  });

  it("renders completion rate section", async () => {
    renderWithProviders(<DashboardPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    expect(screen.getByText("Completion rate by recipient type")).toBeInTheDocument();
  });

  it("renders average completion time section", async () => {
    renderWithProviders(<DashboardPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    await waitFor(() => {
      expect(screen.getByText("Average completion time")).toBeInTheDocument();
    });
  });

  it("displays completion stats summary", async () => {
    renderWithProviders(<DashboardPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    await waitFor(() => {
      expect(screen.getByText("Avg. time to first open")).toBeInTheDocument();
    });
  });

  it("switches response trend range", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    await waitFor(() => {
      expect(screen.getByText("Response trends")).toBeInTheDocument();
    });
    const sevenDayBtns = screen.getAllByRole("button", { name: "7 days" });
    await user.click(sevenDayBtns[0]);
  });

  it("shows company bar chart data", async () => {
    renderWithProviders(<DashboardPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    await waitFor(() => {
      expect(screen.getByText("Days to complete — by company")).toBeInTheDocument();
      expect(screen.getByText("Acme")).toBeInTheDocument();
    });
  });

  it("shows case count and audit link", async () => {
    renderWithProviders(<DashboardPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    await waitFor(() => {
      expect(screen.getByText(/Based on 2 cases/)).toBeInTheDocument();
    });
  });

  it("links to new request", async () => {
    renderWithProviders(<DashboardPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
    const links = screen.getAllByRole("link");
    const newRequestLink = links.find((l) => l.textContent?.includes("New Request"));
    expect(newRequestLink).toBeDefined();
  });
});
