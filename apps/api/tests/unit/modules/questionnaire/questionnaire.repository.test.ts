import { describe, it, expect, beforeEach } from "vitest";
import { QuestionnaireRepository } from "../../../../src/modules/questionnaire/questionnaire.repository.js";
import { createMockDrizzle } from "../../../helpers/mock-drizzle.js";

describe("QuestionnaireRepository", () => {
  let db: ReturnType<typeof createMockDrizzle>;
  let repo: QuestionnaireRepository;

  const caseId = "ffffffff-ffff-ffff-ffff-ffffffffffff";

  beforeEach(() => {
    db = createMockDrizzle();
    repo = new QuestionnaireRepository(db as never);
  });

  it("setOtp upserts otp hash", async () => {
    db.queueResults([]);
    await repo.setOtp(caseId, "hash", new Date("2026-12-31T00:00:00.000Z"));
    expect(db.insert).toHaveBeenCalled();
  });

  it("getOtp returns mapped row or null", async () => {
    db.queueResults([
      {
        caseId,
        otpHash: "hash",
        attempts: 1,
        expiresAt: new Date("2026-12-31T00:00:00.000Z"),
      },
    ]);
    await expect(repo.getOtp(caseId)).resolves.toEqual({
      hash: "hash",
      attempts: 1,
      expiresAt: new Date("2026-12-31T00:00:00.000Z"),
    });

    db.queueResults([]);
    await expect(repo.getOtp(caseId)).resolves.toBeNull();
  });

  it("incrementOtpAttempts and clearOtp mutate otp rows", async () => {
    db.queueResults([]);
    await repo.incrementOtpAttempts(caseId);
    expect(db.update).toHaveBeenCalled();

    db.queueResults([]);
    await repo.clearOtp(caseId);
    expect(db.delete).toHaveBeenCalled();
  });

  it("upsertResponses no-ops on empty payload", async () => {
    await repo.upsertResponses(caseId, []);
    expect(db.select).not.toHaveBeenCalled();
  });

  it("upsertResponses inserts new and updates existing responses", async () => {
    const existing = [
      {
        responseId: "resp-1",
        caseId,
        questionId: "q-1",
        sectionId: null,
        question: "Existing by id",
        answer: "old",
        mandatory: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        responseId: "resp-2",
        caseId,
        questionId: null,
        sectionId: null,
        question: "Existing by text",
        answer: "old",
        mandatory: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    db.queueResults(existing, [], []);
    await repo.upsertResponses(caseId, [
      { questionId: "q-1", question: "Existing by id", answer: "new-by-id" },
      { question: "Existing by text", answer: "new-by-text" },
      { question: "Brand new", answer: "fresh" },
    ]);
    expect(db.transaction).toHaveBeenCalled();
  });

  it("getResponses returns rows for case", async () => {
    const rows = [{ responseId: "resp-1", caseId, question: "Q1" }];
    db.queueResults(rows);
    await expect(repo.getResponses(caseId)).resolves.toEqual(rows);
  });
});
