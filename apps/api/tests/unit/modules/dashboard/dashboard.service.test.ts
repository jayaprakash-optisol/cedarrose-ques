import { describe, it, expect, beforeEach, vi } from "vitest";
import { subDays } from "date-fns";
import { DashboardService, EXPIRED_CAP_DAYS } from "../../../../src/modules/dashboard/dashboard.service.js";
import type { DashboardCaseRow } from "../../../../src/modules/dashboard/dashboard.repository.js";
import { createMockDashboardRepository } from "../../../helpers/mock-repositories.js";

function dashboardRow(overrides: Partial<DashboardCaseRow> = {}): DashboardCaseRow {
  return {
    caseId: "case-1",
    subjectName: "Acme Corp",
    status: "COMPLETED",
    dateDispatched: subDays(new Date(), 5),
    firstOpenedAt: subDays(new Date(), 4),
    dateSubmitted: subDays(new Date(), 2),
    companyId: "company-1",
    companyName: "Acme Corp",
    ...overrides,
  };
}

describe("DashboardService", () => {
  let repo: ReturnType<typeof createMockDashboardRepository>;
  let service: DashboardService;

  beforeEach(() => {
    repo = createMockDashboardRepository();
    service = new DashboardService(repo);
  });

  describe("getCompletionStats", () => {
    it("computes metrics for all-time period", async () => {
      const rows = [
        dashboardRow(),
        dashboardRow({
          caseId: "case-2",
          subjectName: "Beta Inc",
          companyId: "company-2",
          companyName: "Beta Inc",
          status: "IN PROGRESS",
          dateSubmitted: null,
        }),
      ];
      vi.mocked(repo.findCasesForStats).mockResolvedValue(rows);

      const result = await service.getCompletionStats("all");

      expect(result.period).toBe("all");
      expect(result.caseCount).toBe(2);
      expect(result.expiredCapDays).toBe(EXPIRED_CAP_DAYS);
      expect(result.includesInProgress).toBe(true);
      expect(result.summary.avgTimeToFirstOpen.unit).toBe("hours");
      expect(result.summary.avgTimeToComplete.unit).toBe("days");
      expect(result.summary.avgTotalTurnaround.unit).toBe("days");
      expect(result.byCompany.length).toBeGreaterThan(0);
    });

    it("filters rows to 7-day window", async () => {
      const recent = dashboardRow({
        dateDispatched: subDays(new Date(), 3),
        firstOpenedAt: subDays(new Date(), 2),
        dateSubmitted: subDays(new Date(), 1),
      });
      const old = dashboardRow({
        caseId: "old",
        dateDispatched: subDays(new Date(), 20),
        firstOpenedAt: subDays(new Date(), 19),
        dateSubmitted: subDays(new Date(), 18),
      });

      vi.mocked(repo.findCasesForStats).mockResolvedValue([recent, old]);

      const result = await service.getCompletionStats("7d");

      expect(result.period).toBe("7d");
      expect(result.caseCount).toBe(1);
      expect(result.summary.avgTimeToFirstOpen.value).not.toBeNull();
    });

    it("caps expired cases at configured days in company bars", async () => {
      const expired = dashboardRow({
        status: "EXPIRED",
        dateDispatched: subDays(new Date(), 15),
        firstOpenedAt: subDays(new Date(), 14),
        dateSubmitted: null,
      });
      vi.mocked(repo.findCasesForStats).mockResolvedValue([expired]);

      const result = await service.getCompletionStats("all");

      expect(result.byCompany[0].days).toBe(EXPIRED_CAP_DAYS);
      expect(result.byCompany[0].state).toBe("expired");
    });

    it("returns empty metrics when no dispatched cases exist", async () => {
      vi.mocked(repo.findCasesForStats).mockResolvedValue([]);

      const result = await service.getCompletionStats("30d");

      expect(result.caseCount).toBe(0);
      expect(result.summary.avgTimeToFirstOpen.value).toBeNull();
      expect(result.byCompany).toEqual([]);
    });

    it("computes trends for 30-day window", async () => {
      const current = dashboardRow({
        dateDispatched: subDays(new Date(), 10),
        firstOpenedAt: subDays(new Date(), 9),
        dateSubmitted: subDays(new Date(), 8),
      });
      const previous = dashboardRow({
        caseId: "case-prev",
        dateDispatched: subDays(new Date(), 40),
        firstOpenedAt: subDays(new Date(), 39),
        dateSubmitted: subDays(new Date(), 38),
      });
      vi.mocked(repo.findCasesForStats).mockImplementation(async (since) => {
        if (since && since < subDays(new Date(), 35)) return [previous];
        return [current, previous];
      });

      const result = await service.getCompletionStats("30d");

      expect(result.period).toBe("30d");
      expect(result.summary.avgTimeToFirstOpen.trend).not.toBeNull();
      expect(result.summary.avgTimeToComplete.trend).not.toBeNull();
      expect(result.summary.avgTotalTurnaround.trend).not.toBeNull();
    });

    it("labels in-progress and completed statuses in company bars", async () => {
      const sent = dashboardRow({
        caseId: "sent",
        companyId: "co-sent",
        companyName: "Sent Co",
        status: "SENT",
        dateSubmitted: null,
        firstOpenedAt: null,
      });
      const opened = dashboardRow({
        caseId: "opened",
        companyId: "co-opened",
        companyName: "Opened Co",
        status: "OPENED",
        firstOpenedAt: subDays(new Date(), 1),
        dateSubmitted: null,
      });
      const completedMissing = dashboardRow({
        caseId: "cmd",
        companyId: "co-cmd",
        companyName: "Completed Co",
        status: "COMPLETED — MISSING DATA",
      });
      vi.mocked(repo.findCasesForStats).mockResolvedValue([sent, opened, completedMissing]);

      const result = await service.getCompletionStats("all");

      const statuses = result.byCompany.map((bar) => bar.status);
      expect(statuses).toContain("Sent");
      expect(statuses).toContain("Opened");
      expect(statuses).toContain("Completed");
      expect(result.byCompany.some((bar) => bar.endAt === "In progress")).toBe(true);
    });

    it("groups rows without company id and truncates long names", async () => {
      const row = dashboardRow({
        companyId: null,
        companyName: null,
        subjectName: "VeryLongInternationalCompanyName",
        status: "COMPLETED",
      });
      vi.mocked(repo.findCasesForStats).mockResolvedValue([row]);

      const result = await service.getCompletionStats("all");

      expect(result.byCompany[0].shortName.endsWith("…")).toBe(true);
      expect(result.byCompany[0].companyName).toBe("VeryLongInternationalCompanyName");
    });

    it("marks completed companies under average turnaround as under", async () => {
      const fast = dashboardRow({
        caseId: "fast",
        dateDispatched: subDays(new Date(), 2),
        firstOpenedAt: subDays(new Date(), 2),
        dateSubmitted: subDays(new Date(), 1),
        status: "COMPLETED",
      });
      const slow = dashboardRow({
        caseId: "slow",
        companyId: "company-2",
        companyName: "Slow Corp",
        dateDispatched: subDays(new Date(), 20),
        firstOpenedAt: subDays(new Date(), 19),
        dateSubmitted: subDays(new Date(), 1),
        status: "COMPLETED",
      });
      vi.mocked(repo.findCasesForStats).mockResolvedValue([fast, slow]);

      const result = await service.getCompletionStats("all");
      const fastBar = result.byCompany.find((bar) => bar.companyId === "company-1");

      expect(fastBar?.state).toBe("under");
    });

    it("uses current date label when completion date is missing", async () => {
      const row = dashboardRow({
        status: "COMPLETED",
        dateSubmitted: null,
      });
      vi.mocked(repo.findCasesForStats).mockResolvedValue([row]);

      const result = await service.getCompletionStats("all");

      expect(result.byCompany[0].endAt).toMatch(/\d{2} \w{3} \d{4}/);
    });
  });
});
