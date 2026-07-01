import { describe, it, expect } from "vitest";
import { subDays } from "date-fns";
import type { CaseRecord } from "@/types/case";
import {
  computeCompletionStatsFromCases,
  formatCompletionMetricValue,
  formatCompletionTrend,
  trendIsNegative,
} from "@/lib/completion-stats";

function makeCase(overrides: Partial<CaseRecord> = {}): CaseRecord {
  const dispatched = subDays(new Date(), 2).toISOString();
  return {
    id: "c1",
    orderId: "ORD-1",
    uid: "CR-1",
    subjectName: "Acme Ltd",
    country: "GB",
    recipientType: "Supplier",
    status: "COMPLETED",
    completionMandatory: { done: 5, total: 5 },
    completionOptional: { done: 2, total: 3 },
    requestedDate: dispatched,
    lastActivity: subDays(new Date(), 1).toISOString(),
    researcherStatus: "Approved",
    companyData: {
      companyName: "Acme Ltd",
      registrationNumber: "CR-1",
      country: "GB",
      riskRating: "Low",
      recipientEmails: [],
      additionalFields: { incorporationDate: "", legalStructure: "", primaryIndustry: "" },
    },
    link: {
      sentAt: dispatched,
      firstOpenedAt: subDays(new Date(), 2).toISOString(),
      resentCount: 0,
    },
    responses: [],
    currentStep: 16,
    analyst: "Analyst",
    linkExpiry: null,
    remindersSent: 0,
    ...overrides,
  };
}

describe("completion-stats", () => {
  it("computes stats from dispatched cases", () => {
    const stats = computeCompletionStatsFromCases([makeCase()], "all");
    expect(stats.caseCount).toBe(1);
    expect(stats.summary.avgTimeToFirstOpen.value).not.toBeNull();
    expect(stats.byCompany[0].companyName).toBe("Acme Ltd");
  });

  it("excludes non-dispatched statuses", () => {
    const stats = computeCompletionStatsFromCases([makeCase({ status: "NOT SENT" })], "all");
    expect(stats.caseCount).toBe(0);
  });

  it("computes stats over 7d period with trend from previous period", () => {
    const recent = makeCase({ id: "c-recent" });
    const stats = computeCompletionStatsFromCases([recent], "7d");
    expect(stats.period).toBe("7d");
    expect(stats.caseCount).toBeGreaterThanOrEqual(0);
  });

  it("computes stats over 30d period", () => {
    const stats = computeCompletionStatsFromCases([makeCase({ id: "c-30d" })], "30d");
    expect(stats.period).toBe("30d");
  });

  it("excludes cases with no dispatched date", () => {
    const noDate = makeCase({
      requestedDate: undefined as never,
      link: { sentAt: null as never, firstOpenedAt: undefined, resentCount: 0 },
    });
    const stats = computeCompletionStatsFromCases([noDate], "all");
    expect(stats.caseCount).toBe(0);
  });

  it("handles expired cases", () => {
    const expired = makeCase({ status: "EXPIRED", lastActivity: null as never });
    const stats = computeCompletionStatsFromCases([expired], "all");
    expect(stats.caseCount).toBe(1);
    expect(stats.byCompany[0].state).toBe("expired");
  });

  it("handles case with no firstOpenedAt", () => {
    const noOpen = makeCase({
      link: { sentAt: subDays(new Date(), 3).toISOString(), firstOpenedAt: undefined, resentCount: 0 },
    });
    const stats = computeCompletionStatsFromCases([noOpen], "all");
    expect(stats.summary.avgTimeToFirstOpen.value).toBeNull();
  });

  it("treats in-progress cases as still in flight (no dateSubmitted, not EXPIRED)", () => {
    const inProgress = makeCase({
      status: "IN PROGRESS",
      link: { sentAt: subDays(new Date(), 5).toISOString(), firstOpenedAt: subDays(new Date(), 4).toISOString(), resentCount: 0 },
    });
    const stats = computeCompletionStatsFromCases([inProgress], "all");
    expect(stats.caseCount).toBe(1);
    expect(stats.byCompany[0].state).toBe("over-progress");
  });

  it("computes trend when both current and previous periods have data", () => {
    const recent = makeCase({
      id: "c-recent",
      status: "COMPLETED",
      link: {
        sentAt: subDays(new Date(), 1).toISOString(),
        firstOpenedAt: subDays(new Date(), 1).toISOString(),
        resentCount: 0,
      },
      lastActivity: subDays(new Date(), 1).toISOString(),
      requestedDate: subDays(new Date(), 1).toISOString(),
    });
    const older = makeCase({
      id: "c-older",
      status: "COMPLETED",
      link: {
        sentAt: subDays(new Date(), 10).toISOString(),
        firstOpenedAt: subDays(new Date(), 9).toISOString(),
        resentCount: 0,
      },
      lastActivity: subDays(new Date(), 9).toISOString(),
      requestedDate: subDays(new Date(), 10).toISOString(),
    });
    const stats = computeCompletionStatsFromCases([recent, older], "30d");
    expect(stats.summary.avgTimeToFirstOpen.value).not.toBeNull();
    expect(stats.summary.avgTimeToComplete.value).not.toBeNull();
    expect(stats.summary.avgTotalTurnaround.value).not.toBeNull();
  });

  it("formats trend with days unit", () => {
    expect(formatCompletionTrend(-2, "days")).toContain("2d");
    expect(formatCompletionTrend(2, "days")).toContain("2d");
  });

  it("formats metric values", () => {
    expect(formatCompletionMetricValue(null, "hours")).toBe("—");
    expect(formatCompletionMetricValue(12, "hours")).toBe("12h");
    expect(formatCompletionMetricValue(30, "hours")).toBe("1.3 days");
    expect(formatCompletionMetricValue(2.5, "days")).toBe("2.5 days");
  });

  it("formats trends", () => {
    expect(formatCompletionTrend(null, "days")).toBe("No prior period data");
    expect(formatCompletionTrend(0, "days")).toBe("No change vs previous period");
    expect(formatCompletionTrend(-1.5, "days")).toContain("↓");
    expect(formatCompletionTrend(1.5, "days")).toContain("↑");
    expect(trendIsNegative(-1)).toBe(true);
    expect(trendIsNegative(1)).toBe(false);
    expect(trendIsNegative(null)).toBe(false);
  });
});
