import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuditRepository } from "../../../../src/modules/audit/audit.repository.js";
import { createMockDrizzle } from "../../../helpers/mock-drizzle.js";

describe("AuditRepository", () => {
  let db: ReturnType<typeof createMockDrizzle>;
  let repo: AuditRepository;

  const auditRow = {
    auditId: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    caseId: "ffffffff-ffff-ffff-ffff-ffffffffffff",
    caseSubject: "Test Subject",
    caseOrderId: "ORD-001",
    step: 1,
    eventType: "CaseCreated",
    description: "Case created",
    triggeredBy: "analyst@cedarrose.local",
    triggeredByUserId: "11111111-1111-1111-1111-111111111111",
    status: "Success",
    payload: null,
    createdAt: new Date("2026-01-15T00:00:00.000Z"),
  };

  beforeEach(() => {
    db = createMockDrizzle();
    repo = new AuditRepository(db as never);
  });

  it("insert creates and returns audit event", async () => {
    db.queueResults(auditRow);
    await expect(
      repo.insert({
        eventType: "CaseCreated",
        description: "Case created",
        status: "Success",
      })
    ).resolves.toEqual(auditRow);
    expect(db.insert).toHaveBeenCalled();
  });

  it("findAll returns filtered paginated results", async () => {
    db.queueResults([auditRow], [{ total: 1 }]);
    await expect(
      repo.findAll({
        caseId: auditRow.caseId!,
        type: "CaseCreated",
        status: "Success",
        search: "ORD",
        from: new Date("2026-01-01"),
        to: new Date("2026-01-31"),
        offset: 0,
        limit: 10,
      })
    ).resolves.toEqual({ data: [auditRow], total: 1 });
  });

  it("findAll works without optional filters", async () => {
    db.queueResults([], [{ total: 0 }]);
    await expect(repo.findAll({ offset: 0, limit: 20 })).resolves.toEqual({ data: [], total: 0 });
  });

  it("exportBatches yields mapped rows with case status", async () => {
    db.queueResults([auditRow], [{ total: 1 }], [{ caseId: auditRow.caseId!, status: "SENT" }]);
    const batches = [];
    for await (const batch of repo.exportBatches({ caseId: auditRow.caseId! })) {
      batches.push(batch);
    }
    expect(batches).toEqual([[{ ...auditRow, caseStatus: "SENT" }]]);
  });
});
