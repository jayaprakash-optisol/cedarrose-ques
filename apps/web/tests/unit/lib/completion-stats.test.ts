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
    expect(trendIsNegative(-1)).toBe(true);
    expect(trendIsNegative(1)).toBe(false);
  });
});
