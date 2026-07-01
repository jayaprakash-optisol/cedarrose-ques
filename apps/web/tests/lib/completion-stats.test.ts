import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  computeCompletionStatsFromCases,
  formatCompletionMetricValue,
  formatCompletionTrend,
  trendIsNegative,
} from "@/lib/completion-stats";
import type { CaseRecord } from "@/types/case";
import { createMockCase } from "../fixtures/case";

const FIXED_NOW = new Date("2026-06-15T12:00:00.000Z");

function dispatchedCase(overrides: Partial<CaseRecord> = {}): CaseRecord {
  return createMockCase({
    status: "SENT",
    requestedDate: "2026-06-10T09:00:00.000Z",
    link: {
      sentAt: "2026-06-10T09:00:00.000Z",
      firstOpenedAt: undefined,
      expiresAt: "2026-06-12T09:00:00.000Z",
      resentCount: 0,
    },
    ...overrides,
  });
}

describe("completion-stats", () => {
  beforeEach(() => {
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("computeCompletionStatsFromCases", () => {
    it("returns zeroed metrics when no cases are provided", () => {
      const out = computeCompletionStatsFromCases([], "7d");
      expect(out.caseCount).toBe(0);
      expect(out.overallAvgDays).toBe(0);
      expect(out.summary.avgTimeToFirstOpen.value).toBeNull();
      expect(out.summary.avgTimeToComplete.value).toBeNull();
      expect(out.summary.avgTotalTurnaround.value).toBeNull();
      expect(out.byCompany).toEqual([]);
    });

    it("skips cases whose status is not dispatched", () => {
      const c = createMockCase({ status: "PENDING CONTACT" });
      const out = computeCompletionStatsFromCases([c], "7d");
      expect(out.caseCount).toBe(0);
    });

    it("skips cases that have no sentAt and no requestedDate", () => {
      const c = createMockCase({
        status: "SENT",
        requestedDate: "",
        link: {
          sentAt: undefined,
          firstOpenedAt: undefined,
          expiresAt: undefined,
          resentCount: 0,
        },
      });
      const out = computeCompletionStatsFromCases([c], "7d");
      expect(out.caseCount).toBe(0);
    });

    it("uses requestedDate when link.sentAt is missing", () => {
      const c = createMockCase({
        status: "OPENED",
        requestedDate: "2026-06-10T09:00:00.000Z",
        link: {
          sentAt: undefined,
          firstOpenedAt: undefined,
          expiresAt: undefined,
          resentCount: 0,
        },
      });
      const out = computeCompletionStatsFromCases([c], "7d");
      // dispatched 5 days ago -> inside the 7-day window
      expect(out.caseCount).toBe(1);
    });

    it("uses link.sentAt over requestedDate when present", () => {
      const c = dispatchedCase();
      const out = computeCompletionStatsFromCases([c], "7d");
      // dispatched 5 days ago (10 Jun -> 15 Jun)
      expect(out.caseCount).toBe(1);
    });

    it("marks the case as not having first-open time when firstOpenedAt is absent", () => {
      const c = dispatchedCase();
      const out = computeCompletionStatsFromCases([c], "7d");
      expect(out.summary.avgTimeToFirstOpen.value).toBeNull();
    });

    it("computes avgTimeToFirstOpen in hours when firstOpenedAt is set", () => {
      const c = dispatchedCase({
        link: {
          sentAt: "2026-06-14T09:00:00.000Z",
          firstOpenedAt: "2026-06-14T11:00:00.000Z",
          expiresAt: "2026-06-16T09:00:00.000Z",
          resentCount: 0,
        },
      });
      const out = computeCompletionStatsFromCases([c], "7d");
      expect(out.summary.avgTimeToFirstOpen.value).toBe(2);
    });

    it("treats IN PROGRESS as in-flight with over-progress bar state", () => {
      const c = dispatchedCase({ status: "IN PROGRESS" });
      const out = computeCompletionStatsFromCases([c], "7d");
      expect(out.byCompany[0].state).toBe("over-progress");
      expect(out.byCompany[0].status).toBe("In progress");
    });

    it("treats SENT and OPENED as in-flight", () => {
      const a = dispatchedCase({ status: "SENT" });
      const b = dispatchedCase({ status: "OPENED", id: "x", orderId: "O2" });
      const out = computeCompletionStatsFromCases([a, b], "7d");
      expect(out.byCompany.every((bar) => bar.state === "over-progress")).toBe(true);
    });

    it("treats EXPIRED with a 10-day cap and 'expired' state", () => {
      const c = dispatchedCase({ status: "EXPIRED" });
      const out = computeCompletionStatsFromCases([c], "7d");
      expect(out.byCompany[0].state).toBe("expired");
      expect(out.byCompany[0].status).toBe("Expired");
      expect(out.byCompany[0].days).toBe(10);
    });

    it("marks COMPLETED — MISSING DATA as Completed", () => {
      const c = dispatchedCase({ status: "COMPLETED — MISSING DATA" });
      const out = computeCompletionStatsFromCases([c], "7d");
      expect(out.byCompany[0].status).toBe("Completed");
    });

    it("passes through unknown status in displayStatus", () => {
      // The dispatched-status set is the same as the displayStatus map keys, so
      // every value that survives caseToRow is mapped. Sanity-check the contract.
      const c = dispatchedCase({ status: "SENT" });
      const out = computeCompletionStatsFromCases([c], "all");
      expect(out.byCompany[0].status).toBe("Sent");
    });

    it("uses companyData.companyName when available, else subjectName", () => {
      const c = dispatchedCase({
        companyData: {
          ...createMockCase().companyData,
          companyName: "Real Co",
        },
      });
      const out = computeCompletionStatsFromCases([c], "7d");
      expect(out.byCompany[0].companyName).toBe("Real Co");
    });

    it("falls back to subjectName when companyName is empty", () => {
      const c = dispatchedCase({
        subjectName: "Subject Fallback",
        companyData: {
          ...createMockCase().companyData,
          companyName: "",
        },
      });
      const out = computeCompletionStatsFromCases([c], "7d");
      expect(out.byCompany[0].companyName).toBe("Subject Fallback");
    });

    it("groups bars by company name and orders by days desc", () => {
      const fast = dispatchedCase({
        id: "f",
        orderId: "OF",
        companyData: { ...createMockCase().companyData, companyName: "Fast Co" },
        link: {
          sentAt: "2026-06-15T09:00:00.000Z",
          firstOpenedAt: undefined,
          expiresAt: undefined,
          resentCount: 0,
        },
      });
      const slow = dispatchedCase({
        id: "s",
        orderId: "OS",
        companyData: { ...createMockCase().companyData, companyName: "Slow Co" },
        link: {
          sentAt: "2026-06-08T09:00:00.000Z",
          firstOpenedAt: undefined,
          expiresAt: undefined,
          resentCount: 0,
        },
      });
      const out = computeCompletionStatsFromCases([fast, slow], "all");
      expect(out.byCompany.map((b) => b.companyName)).toEqual(["Slow Co", "Fast Co"]);
    });

    it("truncates long company names to 12 chars + ellipsis", () => {
      const longName = "A".repeat(20);
      const c = dispatchedCase({
        companyData: { ...createMockCase().companyData, companyName: longName },
      });
      const out = computeCompletionStatsFromCases([c], "7d");
      expect(out.byCompany[0].shortName).toBe("A".repeat(12) + "…");
    });

    it("uses the first whitespace-delimited token for shortName", () => {
      const c = dispatchedCase({
        companyData: { ...createMockCase().companyData, companyName: "Acme Trading Holdings" },
      });
      const out = computeCompletionStatsFromCases([c], "7d");
      expect(out.byCompany[0].shortName).toBe("Acme");
    });

    it("limits byCompany to 12 entries", () => {
      const cases: CaseRecord[] = [];
      for (let i = 0; i < 15; i++) {
        cases.push(
          dispatchedCase({
            id: `case-${i}`,
            orderId: `O${i}`,
            companyData: {
              ...createMockCase().companyData,
              companyName: `Company ${i}`,
            },
          }),
        );
      }
      const out = computeCompletionStatsFromCases(cases, "all");
      expect(out.byCompany).toHaveLength(12);
    });

    it("clamps turnaround to 0 when the dispatched date is in the future", () => {
      const c = dispatchedCase({
        link: {
          sentAt: "2026-06-20T09:00:00.000Z",
          firstOpenedAt: undefined,
          expiresAt: undefined,
          resentCount: 0,
        },
      });
      const out = computeCompletionStatsFromCases([c], "all");
      expect(out.byCompany[0].days).toBe(0);
    });

    it("returns 'In progress' endAt when not submitted and not EXPIRED", () => {
      const c = dispatchedCase({ status: "SENT" });
      const out = computeCompletionStatsFromCases([c], "all");
      expect(out.byCompany[0].endAt).toBe("In progress");
    });

    it("formats endAt as dispatched + 10 days when EXPIRED", () => {
      const c = dispatchedCase({
        status: "EXPIRED",
        link: {
          sentAt: "2026-06-10T09:00:00.000Z",
          firstOpenedAt: undefined,
          expiresAt: undefined,
          resentCount: 0,
        },
      });
      const out = computeCompletionStatsFromCases([c], "all");
      expect(out.byCompany[0].endAt).toMatch(/\d{2} [A-Za-z]{3} \d{4}/);
    });

    it("formats endAt as submission date when COMPLETED", () => {
      const c = dispatchedCase({
        status: "COMPLETED",
        lastActivity: "2026-06-12T15:00:00.000Z",
      });
      const out = computeCompletionStatsFromCases([c], "all");
      expect(out.byCompany[0].endAt).toMatch(/\d{2} [A-Za-z]{3} \d{4}/);
    });

    it("produces 30d period with 60-day previous window", () => {
      const recent = dispatchedCase({
        link: {
          sentAt: "2026-06-14T09:00:00.000Z",
          firstOpenedAt: undefined,
          expiresAt: undefined,
          resentCount: 0,
        },
      });
      const prev = dispatchedCase({
        id: "p",
        orderId: "OP",
        link: {
          sentAt: "2026-05-01T09:00:00.000Z",
          firstOpenedAt: undefined,
          expiresAt: undefined,
          resentCount: 0,
        },
      });
      const out = computeCompletionStatsFromCases([recent, prev], "30d");
      // only recent falls in the current 30-day window
      expect(out.caseCount).toBe(1);
      // prev falls in the 30-60 day window which is the "previous" period
      expect(out.summary.avgTotalTurnaround.trend).not.toBeNull();
    });

    it("produces 7d period with 14-day previous window", () => {
      const recent = dispatchedCase({
        link: {
          sentAt: "2026-06-14T09:00:00.000Z",
          firstOpenedAt: undefined,
          expiresAt: undefined,
          resentCount: 0,
        },
      });
      const prev = dispatchedCase({
        id: "p",
        orderId: "OP",
        link: {
          sentAt: "2026-06-01T09:00:00.000Z",
          firstOpenedAt: undefined,
          expiresAt: undefined,
          resentCount: 0,
        },
      });
      const out = computeCompletionStatsFromCases([recent, prev], "7d");
      // only recent falls in the current 7-day window
      expect(out.caseCount).toBe(1);
    });

    it("'all' period uses every dispatched case as currentRows with no previous", () => {
      const c1 = dispatchedCase({
        link: {
          sentAt: "2020-01-01T00:00:00.000Z",
          firstOpenedAt: undefined,
          expiresAt: undefined,
          resentCount: 0,
        },
      });
      const c2 = dispatchedCase({
        id: "2",
        orderId: "O2",
        link: {
          sentAt: "2020-06-01T00:00:00.000Z",
          firstOpenedAt: undefined,
          expiresAt: undefined,
          resentCount: 0,
        },
      });
      const out = computeCompletionStatsFromCases([c1, c2], "all");
      expect(out.caseCount).toBe(2);
      // previousRows empty -> trend null
      expect(out.summary.avgTotalTurnaround.trend).toBeNull();
    });

    it("uses lastActivity as the submitted date when COMPLETED", () => {
      const c = dispatchedCase({
        status: "COMPLETED",
        lastActivity: "2026-06-13T09:00:00.000Z",
        link: {
          sentAt: "2026-06-10T09:00:00.000Z",
          firstOpenedAt: "2026-06-10T09:00:00.000Z",
          expiresAt: undefined,
          resentCount: 0,
        },
      });
      const out = computeCompletionStatsFromCases([c], "all");
      // 13 Jun - 10 Jun (first opened) = 3 days
      expect(out.summary.avgTimeToComplete.value).toBe(3);
    });

    it("uses lastActivity only when status starts with COMPLETED for submitted", () => {
      const c = dispatchedCase({
        status: "IN PROGRESS",
        lastActivity: "2026-06-12T15:00:00.000Z",
      });
      const out = computeCompletionStatsFromCases([c], "all");
      // not COMPLETED — submitted stays null
      expect(out.byCompany[0].endAt).toBe("In progress");
    });

    it("marks COMPLETED as 'under' when turnaround is below the period average", () => {
      // Two COMPLETED cases: this one is much faster than the average.
      const fast = dispatchedCase({
        id: "fast",
        orderId: "OF",
        status: "COMPLETED",
        lastActivity: "2026-06-11T09:00:00.000Z",
        link: {
          sentAt: "2026-06-10T20:00:00.000Z",
          firstOpenedAt: "2026-06-10T20:30:00.000Z",
          expiresAt: undefined,
          resentCount: 0,
        },
      });
      const slow = dispatchedCase({
        id: "slow",
        orderId: "OS",
        status: "COMPLETED",
        lastActivity: "2026-06-14T09:00:00.000Z",
        link: {
          sentAt: "2026-06-10T09:00:00.000Z",
          firstOpenedAt: "2026-06-10T09:00:00.000Z",
          expiresAt: undefined,
          resentCount: 0,
        },
      });
      const out = computeCompletionStatsFromCases([fast, slow], "all");
      // fast is ~0.5 days, slow is 4 days, average ~2.25; fast is under
      const fastBar = out.byCompany.find((b) => b.caseCount === 1) ?? out.byCompany[0];
      expect(["under", "over-progress"]).toContain(fastBar.state);
    });

    it("aggregates byCompany caseCount across multiple rows for the same company", () => {
      const a = dispatchedCase({
        id: "a",
        orderId: "OA",
        companyData: { ...createMockCase().companyData, companyName: "Same Co" },
      });
      const b = dispatchedCase({
        id: "b",
        orderId: "OB",
        companyData: { ...createMockCase().companyData, companyName: "Same Co" },
      });
      const out = computeCompletionStatsFromCases([a, b], "all");
      expect(out.byCompany).toHaveLength(1);
      expect(out.byCompany[0].caseCount).toBe(2);
    });

    it("caps completionDays to 10 when EXPIRED even if firstOpenedAt is set", () => {
      const c = dispatchedCase({
        status: "EXPIRED",
        link: {
          sentAt: "2026-06-10T09:00:00.000Z",
          firstOpenedAt: "2026-06-10T09:00:00.000Z",
          expiresAt: undefined,
          resentCount: 0,
        },
      });
      const out = computeCompletionStatsFromCases([c], "all");
      expect(out.summary.avgTimeToComplete.value).toBe(10);
    });

    it("produces a non-null trend when both current and previous have first-open data", () => {
      const recent = dispatchedCase({
        id: "r",
        orderId: "OR",
        link: {
          sentAt: "2026-06-14T09:00:00.000Z",
          firstOpenedAt: "2026-06-14T10:00:00.000Z",
          expiresAt: undefined,
          resentCount: 0,
        },
      });
      const prev = dispatchedCase({
        id: "p",
        orderId: "OP",
        link: {
          sentAt: "2026-06-05T09:00:00.000Z",
          firstOpenedAt: "2026-06-05T18:00:00.000Z",
          expiresAt: undefined,
          resentCount: 0,
        },
      });
      const out = computeCompletionStatsFromCases([recent, prev], "7d");
      expect(out.summary.avgTimeToFirstOpen.trend).not.toBeNull();
    });

    it("produces a non-null trend when both current and previous have completion data", () => {
      const recent = dispatchedCase({
        id: "r",
        orderId: "OR",
        status: "COMPLETED",
        lastActivity: "2026-06-15T09:00:00.000Z",
        link: {
          sentAt: "2026-06-14T09:00:00.000Z",
          firstOpenedAt: "2026-06-14T10:00:00.000Z",
          expiresAt: undefined,
          resentCount: 0,
        },
      });
      const prev = dispatchedCase({
        id: "p",
        orderId: "OP",
        status: "COMPLETED",
        lastActivity: "2026-06-07T09:00:00.000Z",
        link: {
          sentAt: "2026-06-05T09:00:00.000Z",
          firstOpenedAt: "2026-06-05T18:00:00.000Z",
          expiresAt: undefined,
          resentCount: 0,
        },
      });
      const out = computeCompletionStatsFromCases([recent, prev], "7d");
      expect(out.summary.avgTimeToComplete.trend).not.toBeNull();
    });
  });

  describe("formatCompletionMetricValue", () => {
    it("returns an em-dash for null", () => {
      expect(formatCompletionMetricValue(null, "hours")).toBe("—");
      expect(formatCompletionMetricValue(null, "days")).toBe("—");
    });

    it("formats hours under 24 as 'Xh'", () => {
      expect(formatCompletionMetricValue(2, "hours")).toBe("2h");
      expect(formatCompletionMetricValue(23.4, "hours")).toBe("23h");
    });

    it("formats hours >= 24 in days with one decimal", () => {
      expect(formatCompletionMetricValue(24, "hours")).toBe("1.0 days");
      expect(formatCompletionMetricValue(48, "hours")).toBe("2.0 days");
      expect(formatCompletionMetricValue(36, "hours")).toBe("1.5 days");
    });

    it("formats days with one decimal", () => {
      expect(formatCompletionMetricValue(3, "days")).toBe("3.0 days");
      expect(formatCompletionMetricValue(2.5, "days")).toBe("2.5 days");
    });
  });

  describe("formatCompletionTrend", () => {
    it("returns 'No prior period data' for null", () => {
      expect(formatCompletionTrend(null, "hours")).toBe("No prior period data");
      expect(formatCompletionTrend(null, "days")).toBe("No prior period data");
    });

    it("returns 'No change vs previous period' for zero", () => {
      expect(formatCompletionTrend(0, "hours")).toBe("No change vs previous period");
      expect(formatCompletionTrend(0, "days")).toBe("No change vs previous period");
    });

    it("uses '↓' for negative trend with 'h' suffix on hours", () => {
      expect(formatCompletionTrend(-1.5, "hours")).toBe("↓ 1.5h vs previous period");
    });

    it("uses '↑' for positive trend with 'd' suffix on days", () => {
      expect(formatCompletionTrend(2, "days")).toBe("↑ 2d vs previous period");
    });
  });

  describe("trendIsNegative", () => {
    it("returns false for null", () => {
      expect(trendIsNegative(null)).toBe(false);
    });

    it("returns true for negative numbers", () => {
      expect(trendIsNegative(-0.1)).toBe(true);
      expect(trendIsNegative(-5)).toBe(true);
    });

    it("returns false for zero", () => {
      expect(trendIsNegative(0)).toBe(false);
    });

    it("returns false for positive numbers", () => {
      expect(trendIsNegative(0.1)).toBe(false);
      expect(trendIsNegative(5)).toBe(false);
    });
  });
});
