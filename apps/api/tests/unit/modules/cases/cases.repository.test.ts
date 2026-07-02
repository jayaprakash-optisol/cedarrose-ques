import { describe, it, expect, beforeEach } from "vitest";
import { CasesRepository } from "../../../../src/modules/cases/cases.repository.js";
import { createMockDrizzle } from "../../../helpers/mock-drizzle.js";
import { createMockCase } from "../../../helpers/mock-case.js";

describe("CasesRepository", () => {
  let db: ReturnType<typeof createMockDrizzle>;
  let repo: CasesRepository;

  const caseRow = createMockCase();
  const caseRowWithCompany = createMockCase({
    externalRef: "CRIS-001",
    riskRating: "Low",
    recipientEmails: ["contact@acme.com"],
  });

  beforeEach(() => {
    db = createMockDrizzle();
    repo = new CasesRepository(db as never);
  });

  it("findById returns enriched case with company snapshot from denormalized fields", async () => {
    db.queueResults(
      [{ case: caseRowWithCompany, analystFirstName: "Ana" }],
      [{ step: 1, createdAt: new Date("2026-01-15T00:00:00.000Z") }]
    );
    const found = await repo.findById(caseRowWithCompany.caseId);
    expect(found?.analystName).toBe("Ana");
    expect(found?.company?.companyName).toBe(caseRowWithCompany.subjectName);
    expect(found?.company?.crisNumber).toBe("CRIS-001");
    expect(found?.company?.recipientEmails).toEqual(["contact@acme.com"]);
    expect(found?.stepTimestamps?.[1]).toBeDefined();

    db.queueResults([]);
    await expect(repo.findById("missing")).resolves.toBeNull();
  });

  it("findById returns null company snapshot when no externalRef", async () => {
    db.queueResults(
      [{ case: caseRow, analystFirstName: null }],
      []
    );
    const found = await repo.findById(caseRow.caseId);
    expect(found?.company).toBeNull();
  });

  it("findAll applies filters and returns paginated data", async () => {
    db.queueResults(
      [{ case: caseRow, analystFirstName: "Ana" }],
      [{ total: 1 }]
    );
    const result = await repo.findAll({
      status: "NOT SENT",
      recipientType: "Supplier",
      country: "UK",
      analystId: caseRow.analystId!,
      search: "Acme",
      offset: 0,
      limit: 10,
    });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("findAll works without filters", async () => {
    db.queueResults([], [{ total: 0 }]);
    await expect(repo.findAll({ offset: 0, limit: 20 })).resolves.toEqual({ data: [], total: 0 });
  });

  it("getResponses returns questionnaire rows", async () => {
    const responses = [{ responseId: "r-1", caseId: caseRow.caseId, question: "Q1" }];
    db.queueResults(responses);
    await expect(repo.getResponses(caseRow.caseId)).resolves.toEqual(responses);
  });

  it("getNextCaseRef increments padded counter", async () => {
    db.queueResults([{ count: 5 }]);
    await expect(repo.getNextCaseRef()).resolves.toBe("c-006");
  });

  it("create and update return rows", async () => {
    db.queueResults(caseRow);
    await expect(repo.create(caseRow)).resolves.toEqual(caseRow);

    const updated = { ...caseRow, status: "SENT" };
    db.queueResults(updated);
    await expect(repo.update(caseRow.caseId, { status: "SENT" })).resolves.toEqual(updated);
  });

  it("findByLinkHash returns active case or null", async () => {
    db.queueResults([caseRow]);
    await expect(repo.findByLinkHash("hash")).resolves.toEqual(caseRow);

    db.queueResults([]);
    await expect(repo.findByLinkHash("missing")).resolves.toBeNull();
  });

  it("findExpiredActive, findByStatuses, and findStaleInProgress query cases", async () => {
    db.queueResults([caseRow]);
    await expect(repo.findExpiredActive()).resolves.toEqual([caseRow]);

    db.queueResults([caseRow]);
    await expect(repo.findByStatuses(["SENT"])).resolves.toEqual([caseRow]);

    db.queueResults([caseRow]);
    await expect(repo.findStaleInProgress(new Date("2020-01-01"))).resolves.toEqual([caseRow]);
  });

  it("incrementRemindersSent no-ops when case is missing", async () => {
    db.queueResults([]);
    await repo.incrementRemindersSent("missing");
    expect(db.update).not.toHaveBeenCalled();
  });

  it("incrementRemindersSent updates reminder count", async () => {
    const withReminders = { ...caseRow, remindersSent: 2 };
    db.queueResults(
      [{ case: withReminders, analystFirstName: null }],
      [],
      withReminders
    );
    await repo.incrementRemindersSent(caseRow.caseId);
    expect(db.update).toHaveBeenCalled();
  });

  it("findByLinkTokenHash returns row or null", async () => {
    db.queueResults([caseRow]);
    await expect(repo.findByLinkTokenHash("hash")).resolves.toEqual(caseRow);

    db.queueResults([]);
    await expect(repo.findByLinkTokenHash("missing")).resolves.toBeNull();
  });

  it("isLinkExpired returns boolean", async () => {
    db.queueResults([{ expired: true }]);
    await expect(repo.isLinkExpired(caseRow.caseId)).resolves.toBe(true);

    db.queueResults([{ expired: false }]);
    await expect(repo.isLinkExpired(caseRow.caseId)).resolves.toBe(false);

    db.queueResults([]);
    await expect(repo.isLinkExpired(caseRow.caseId)).resolves.toBe(false);
  });

  it("exportBatches yields multiple batches", async () => {
    db.queueResults(
      [{ case: caseRow, analystFirstName: "Ana" }],
      [{ total: 500 }],
      [],
      [{ case: caseRow, analystFirstName: "Ana" }],
      [{ total: 1 }],
      [],
      [],
      [{ total: 0 }],
      [],
    );
    const batches = [];
    for await (const batch of repo.exportBatches({})) {
      batches.push(batch);
    }
    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(1);
  });
});
