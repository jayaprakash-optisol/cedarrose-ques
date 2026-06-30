import { describe, it, expect, beforeEach } from "vitest";
import { CompaniesRepository } from "../../../../src/modules/companies/companies.repository.js";
import { createMockDrizzle } from "../../../helpers/mock-drizzle.js";

describe("CompaniesRepository", () => {
  let db: ReturnType<typeof createMockDrizzle>;
  let repo: CompaniesRepository;

  const companyRow = {
    companyId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    companyName: "Acme Corp",
    crisNumber: "CRIS-001",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    country: "UK",
    riskRating: "Low",
    incorporationDate: null,
    legalStructure: null,
    primaryIndustry: null,
  };

  beforeEach(() => {
    db = createMockDrizzle();
    repo = new CompaniesRepository(db as never);
  });

  it("findByCrisNumber returns row or null", async () => {
    db.queueResults([companyRow]);
    await expect(repo.findByCrisNumber("CRIS-001")).resolves.toEqual(companyRow);

    db.queueResults([]);
    await expect(repo.findByCrisNumber("missing")).resolves.toBeNull();
  });

  it("findById returns row or null", async () => {
    db.queueResults([companyRow]);
    await expect(repo.findById(companyRow.companyId)).resolves.toEqual(companyRow);

    db.queueResults([]);
    await expect(repo.findById("missing")).resolves.toBeNull();
  });

  it("findAll returns paginated data and total", async () => {
    db.queueResults([companyRow], [{ total: 1 }]);
    await expect(repo.findAll(0, 10)).resolves.toEqual({ data: [companyRow], total: 1 });
  });

  it("create inserts and returns row", async () => {
    db.queueResults(companyRow);
    await expect(
      repo.create({
        companyName: companyRow.companyName,
        crisNumber: companyRow.crisNumber,
      })
    ).resolves.toEqual(companyRow);
    expect(db.insert).toHaveBeenCalled();
  });

  it("update patches company and returns row", async () => {
    const updated = { ...companyRow, companyName: "Acme Updated" };
    db.queueResults(updated);
    await expect(repo.update(companyRow.companyId, { companyName: "Acme Updated" })).resolves.toEqual(
      updated
    );
    expect(db.update).toHaveBeenCalled();
  });

  it("getRecipientEmails returns email rows", async () => {
    const emails = [
      {
        emailId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        companyId: companyRow.companyId,
        email: "contact@acme.com",
        isPrimary: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ];
    db.queueResults(emails);
    await expect(repo.getRecipientEmails(companyRow.companyId)).resolves.toEqual(emails);
  });

  it("addRecipientEmail inserts email row", async () => {
    const emailRow = {
      emailId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      companyId: companyRow.companyId,
      email: "new@acme.com",
      isPrimary: false,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    db.queueResults(emailRow);
    await expect(repo.addRecipientEmail(companyRow.companyId, "new@acme.com")).resolves.toEqual(emailRow);
  });
});
