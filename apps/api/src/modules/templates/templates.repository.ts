import { eq, and, asc, sql, inArray } from "drizzle-orm";
import type { DrizzleDB } from "../../config/database.js";
import { templates, templateSnapshots } from "../../db/schema/templates.js";
import { sections } from "../../db/schema/sections.js";
import { questions } from "../../db/schema/questions.js";
import { users } from "../../db/schema/users.js";

export class TemplatesRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findAllSummaries() {
    const rows = await this.db
      .select({
        templateId: templates.templateId,
        name: templates.name,
        description: templates.description,
        status: templates.status,
        recipientType: templates.recipientType,
        version: templates.version,
        createdBy: templates.createdBy,
        updatedBy: templates.updatedBy,
        lastEditedAt: templates.lastEditedAt,
        createdAt: templates.createdAt,
        updatedAt: templates.updatedAt,
        editorFirstName: users.firstName,
        editorLastName: users.lastName,
        totalQuestions: sql<number>`cast(count(${questions.questionId}) as int)`,
        requiredCount: sql<number>`cast(count(${questions.questionId}) filter (where ${questions.mandatory} = true) as int)`,
      })
      .from(templates)
      .leftJoin(users, eq(templates.updatedBy, users.userId))
      .leftJoin(sections, eq(sections.templateId, templates.templateId))
      .leftJoin(questions, eq(questions.sectionId, sections.sectionId))
      .groupBy(
        templates.templateId,
        users.firstName,
        users.lastName
      )
      .orderBy(templates.updatedAt);

    return rows.map((row) => ({
      templateId: row.templateId,
      name: row.name,
      description: row.description,
      status: row.status,
      recipientType: row.recipientType,
      version: row.version,
      createdBy: row.createdBy,
      updatedBy: row.updatedBy,
      lastEditedAt: row.lastEditedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      editorName:
        row.editorFirstName && row.editorLastName
          ? `${row.editorFirstName} ${row.editorLastName}`.trim()
          : null,
      totalQuestions: Number(row.totalQuestions ?? 0),
      requiredCount: Number(row.requiredCount ?? 0),
      optionalCount: Number(row.totalQuestions ?? 0) - Number(row.requiredCount ?? 0),
    }));
  }

  async findById(templateId: string) {
    const [row] = await this.db
      .select()
      .from(templates)
      .where(eq(templates.templateId, templateId))
      .limit(1);
    return row ?? null;
  }

  async findActiveByRecipientType(recipientType: string) {
    const [row] = await this.db
      .select()
      .from(templates)
      .where(and(eq(templates.recipientType, recipientType), eq(templates.status, "Active")))
      .limit(1);
    return row ?? null;
  }

  async getFullTemplate(templateId: string) {
    const template = await this.findById(templateId);
    if (!template) return null;

    const sectionRows = await this.db
      .select()
      .from(sections)
      .where(eq(sections.templateId, templateId))
      .orderBy(asc(sections.orderIndex));

    const sectionIds = sectionRows.map((section) => section.sectionId);
    const questionRows = sectionIds.length
      ? await this.db
          .select()
          .from(questions)
          .where(inArray(questions.sectionId, sectionIds))
          .orderBy(asc(questions.orderIndex))
      : [];

    const questionsBySection = new Map<string, (typeof questionRows)[number][]>();
    for (const question of questionRows) {
      const list = questionsBySection.get(question.sectionId) ?? [];
      list.push(question);
      questionsBySection.set(question.sectionId, list);
    }

    const result = sectionRows.map((section) => ({
      ...section,
      questions: questionsBySection.get(section.sectionId) ?? [],
    }));

    return { ...template, sections: result };
  }

  async create(data: typeof templates.$inferInsert) {
    const [row] = await this.db.insert(templates).values(data).returning();
    return row;
  }

  async update(templateId: string, data: Partial<typeof templates.$inferInsert>) {
    const [row] = await this.db
      .update(templates)
      .set({ ...data, updatedAt: new Date(), lastEditedAt: new Date() })
      .where(eq(templates.templateId, templateId))
      .returning();
    return row;
  }

  async delete(templateId: string) {
    await this.db.delete(templates).where(eq(templates.templateId, templateId));
  }

  async saveSnapshot(templateId: string, version: number, snapshot: unknown) {
    await this.db.insert(templateSnapshots).values({
      templateId,
      version,
      snapshot,
    });
  }

  async replaceSectionsAndQuestions(
    templateId: string,
    sectionData: {
      title: string;
      description?: string;
      banner?: string;
      orderIndex: number;
      questions: Array<typeof questions.$inferInsert>;
    }[]
  ) {
    await this.db.transaction(async (tx) => {
      await tx.delete(sections).where(eq(sections.templateId, templateId));

      if (!sectionData.length) return;

      const insertedSections = await tx
        .insert(sections)
        .values(
          sectionData.map((section) => ({
            templateId,
            title: section.title,
            description: section.description,
            banner: section.banner,
            orderIndex: section.orderIndex,
          })),
        )
        .returning();

      const questionValues = insertedSections.flatMap((section, index) =>
        sectionData[index].questions.map((question, questionIndex) => ({
          ...question,
          sectionId: section.sectionId,
          orderIndex: question.orderIndex ?? questionIndex,
        })),
      );

      if (questionValues.length) {
        await tx.insert(questions).values(questionValues);
      }
    });
  }
}
