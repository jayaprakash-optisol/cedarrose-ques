import { describe, it, expect, beforeEach } from "vitest";
import { TemplatesRepository } from "../../../../src/modules/templates/templates.repository.js";
import { createMockDrizzle } from "../../../helpers/mock-drizzle.js";

describe("TemplatesRepository", () => {
  let db: ReturnType<typeof createMockDrizzle>;
  let repo: TemplatesRepository;

  const templateRow = {
    templateId: "tttttttt-tttt-tttt-tttt-tttttttttttt",
    name: "Supplier Template",
    description: "Desc",
    status: "Active",
    recipientType: "Supplier",
    version: 1,
    createdBy: "11111111-1111-1111-1111-111111111111",
    updatedBy: "11111111-1111-1111-1111-111111111111",
    lastEditedAt: new Date("2026-01-01T00:00:00.000Z"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  beforeEach(() => {
    db = createMockDrizzle();
    repo = new TemplatesRepository(db as never);
  });

  it("findAllSummaries maps editor and question counts", async () => {
    db.queueResults([
      {
        ...templateRow,
        editorFirstName: "Ada",
        editorLastName: "Lovelace",
        totalQuestions: 5,
        requiredCount: 3,
      },
    ]);
    const rows = await repo.findAllSummaries();
    expect(rows[0].editorName).toBe("Ada Lovelace");
    expect(rows[0].optionalCount).toBe(2);
  });

  it("findAllSummaries handles missing editor name", async () => {
    db.queueResults([
      {
        ...templateRow,
        editorFirstName: null,
        editorLastName: null,
        totalQuestions: 0,
        requiredCount: 0,
      },
    ]);
    const rows = await repo.findAllSummaries();
    expect(rows[0].editorName).toBeNull();
  });

  it("findAllSummaries handles null question counts", async () => {
    db.queueResults([
      {
        ...templateRow,
        editorFirstName: null,
        editorLastName: null,
        totalQuestions: null,
        requiredCount: null,
      },
    ]);
    const rows = await repo.findAllSummaries();
    expect(rows[0].totalQuestions).toBe(0);
    expect(rows[0].requiredCount).toBe(0);
    expect(rows[0].optionalCount).toBe(0);
  });

  it("findById and findActiveByRecipientType return row or null", async () => {
    db.queueResults([templateRow]);
    await expect(repo.findById(templateRow.templateId)).resolves.toEqual(templateRow);

    db.queueResults([]);
    await expect(repo.findById("missing")).resolves.toBeNull();

    db.queueResults([templateRow]);
    await expect(repo.findActiveByRecipientType("Supplier")).resolves.toEqual(templateRow);

    db.queueResults([]);
    await expect(repo.findActiveByRecipientType("Unknown")).resolves.toBeNull();
  });

  it("getFullTemplate returns null when template missing", async () => {
    db.queueResults([]);
    await expect(repo.getFullTemplate("missing")).resolves.toBeNull();
  });

  it("getFullTemplate assembles sections and questions", async () => {
    const section = {
      sectionId: "ssssssss-ssss-ssss-ssss-ssssssssssss",
      templateId: templateRow.templateId,
      title: "Section 1",
      description: null,
      banner: null,
      orderIndex: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const question = {
      questionId: "qqqqqqqq-qqqq-qqqq-qqqq-qqqqqqqqqqqq",
      sectionId: section.sectionId,
      label: "Company name",
      fieldType: "text",
      mandatory: true,
      orderIndex: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    db.queueResults([templateRow], [section], [question]);
    const full = await repo.getFullTemplate(templateRow.templateId);
    expect(full?.sections).toHaveLength(1);
    expect(full?.sections[0].questions).toHaveLength(1);
  });

  it("getFullTemplate handles template with no sections", async () => {
    db.queueResults([templateRow], [], []);
    const full = await repo.getFullTemplate(templateRow.templateId);
    expect(full?.sections).toEqual([]);
  });

  it("getFullTemplate handles section with no matching questions", async () => {
    const section1 = {
      sectionId: "s1",
      templateId: templateRow.templateId,
      title: "Section 1",
      description: null,
      banner: null,
      orderIndex: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const section2 = {
      ...section1,
      sectionId: "s2",
      title: "Section 2",
      orderIndex: 1,
    };
    const question = {
      questionId: "q1",
      sectionId: "s1",
      label: "Q1",
      fieldType: "text",
      mandatory: true,
      orderIndex: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    db.queueResults([templateRow], [section1, section2], [question]);
    const full = await repo.getFullTemplate(templateRow.templateId);
    expect(full?.sections).toHaveLength(2);
    expect(full?.sections[0].questions).toHaveLength(1);
    expect(full?.sections[1].questions).toEqual([]);
  });

  it("create, update, delete, and saveSnapshot mutate data", async () => {
    db.queueResults(templateRow);
    await expect(repo.create(templateRow)).resolves.toEqual(templateRow);

    const updated = { ...templateRow, name: "Updated" };
    db.queueResults(updated);
    await expect(repo.update(templateRow.templateId, { name: "Updated" })).resolves.toEqual(updated);

    db.queueResults([]);
    await repo.delete(templateRow.templateId);
    expect(db.delete).toHaveBeenCalled();

    db.queueResults([]);
    await repo.saveSnapshot(templateRow.templateId, 2, { snapshot: true });
    expect(db.insert).toHaveBeenCalled();
  });

  it("replaceSectionsAndQuestions replaces nested content in transaction", async () => {
    const insertedSection = {
      sectionId: "ssssssss-ssss-ssss-ssss-ssssssssssss",
      templateId: templateRow.templateId,
      title: "Section 1",
      description: null,
      banner: null,
      orderIndex: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    db.queueResults([], [insertedSection], []);
    await repo.replaceSectionsAndQuestions(templateRow.templateId, [
      {
        title: "Section 1",
        orderIndex: 0,
        questions: [{ sectionId: "s1", label: "Q1", fieldType: "text", mandatory: true }],
      },
    ]);
    expect(db.transaction).toHaveBeenCalled();
  });

  it("replaceSectionsAndQuestions no-ops when section list is empty", async () => {
    db.queueResults([]);
    await repo.replaceSectionsAndQuestions(templateRow.templateId, []);
    expect(db.transaction).toHaveBeenCalled();
  });

  it("replaceSectionsAndQuestions skips question insert when questions empty", async () => {
    const insertedSection = {
      sectionId: "s-empty-q",
      templateId: templateRow.templateId,
      title: "No Questions",
      description: null,
      banner: null,
      orderIndex: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    db.queueResults([], [insertedSection], []);
    await repo.replaceSectionsAndQuestions(templateRow.templateId, [
      { title: "No Questions", orderIndex: 0, questions: [] },
    ]);
    expect(db.transaction).toHaveBeenCalled();
  });
});
