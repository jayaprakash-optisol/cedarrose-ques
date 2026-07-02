import { describe, it, expect, beforeEach } from "vitest";
import { CompanyRequestsRepository } from "../../../../src/modules/company-requests/company-requests.repository.js";
import { createMockDrizzle } from "../../../helpers/mock-drizzle.js";

const REQUEST_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const CASE_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const upsertInput = {
  orderId: "ORD-10001",
  externalRef: "UID-44529",
  companyName: "Acme Trading LLC",
  country: "UAE",
  riskRating: "Low",
  recipientEmails: ["contact@acme.example"],
  rawPayload: { orderId: "ORD-10001" },
};

const storedRow = {
  companyRequestId: REQUEST_ID,
  ...upsertInput,
  status: "Pending",
};

describe("CompanyRequestsRepository", () => {
  let db: ReturnType<typeof createMockDrizzle>;
  let repo: CompanyRequestsRepository;

  beforeEach(() => {
    db = createMockDrizzle();
    repo = new CompanyRequestsRepository(db as never);
  });

  it("upsert inserts the payload and returns the stored row", async () => {
    db.queueResults(storedRow);

    await expect(repo.upsert(upsertInput)).resolves.toEqual(storedRow);
    expect(db.insert).toHaveBeenCalled();
  });

  it("findAll returns rows filtered by status", async () => {
    db.queueResults([storedRow]);

    await expect(repo.findAll("Pending")).resolves.toEqual([storedRow]);
    expect(db.select).toHaveBeenCalled();
  });

  it("findAll returns all rows when no status is given", async () => {
    db.queueResults([storedRow, { ...storedRow, status: "Used" }]);

    const rows = await repo.findAll();
    expect(rows).toHaveLength(2);
  });

  it("findById returns the row when found", async () => {
    db.queueResults([storedRow]);

    await expect(repo.findById(REQUEST_ID)).resolves.toEqual(storedRow);
  });

  it("findById returns null when missing", async () => {
    db.queueResults([]);

    await expect(repo.findById(REQUEST_ID)).resolves.toBeNull();
  });

  it("markConsumed flips the row to Used with the case id", async () => {
    const consumed = { ...storedRow, status: "Used", caseId: CASE_ID };
    db.queueResults(consumed);

    await expect(repo.markConsumed(REQUEST_ID, CASE_ID)).resolves.toEqual(consumed);
    expect(db.update).toHaveBeenCalled();
  });
});
