import { describe, it, expect, beforeEach } from "vitest";
import { DashboardRepository } from "../../../../src/modules/dashboard/dashboard.repository.js";
import { createMockDrizzle } from "../../../helpers/mock-drizzle.js";

describe("DashboardRepository", () => {
  let db: ReturnType<typeof createMockDrizzle>;
  let repo: DashboardRepository;

  const caseRow = {
    caseId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    subjectName: "Test Subject",
    status: "SENT",
    dateDispatched: new Date("2026-01-10T00:00:00.000Z"),
    firstOpenedAt: null,
    dateSubmitted: null,
    companyId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    companyName: "Acme Corp",
  };

  beforeEach(() => {
    db = createMockDrizzle();
    repo = new DashboardRepository(db as never);
  });

  it("findCasesForStats returns dispatched cases with company join", async () => {
    db.queueResults([caseRow]);
    await expect(repo.findCasesForStats()).resolves.toEqual([caseRow]);
    expect(db.select).toHaveBeenCalled();
  });

  it("findCasesForStats applies since filter when provided", async () => {
    const since = new Date("2026-01-01T00:00:00.000Z");
    db.queueResults([caseRow]);
    await expect(repo.findCasesForStats(since)).resolves.toEqual([caseRow]);
  });
});
