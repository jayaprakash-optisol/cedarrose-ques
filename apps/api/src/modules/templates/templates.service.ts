import type { TemplatesRepository } from "./templates.repository.js";
import { AppError } from "../../shared/errors/AppError.js";

export class TemplatesService {
  constructor(private readonly templatesRepo: TemplatesRepository) {}

  async list() {
    return this.templatesRepo.findAllSummaries();
  }

  async getById(templateId: string) {
    const template = await this.templatesRepo.getFullTemplate(templateId);
    if (!template) throw new AppError(404, "NOT_FOUND", "Template not found");
    return template;
  }

  async create(dto: {
    name: string;
    description?: string;
    recipientType?: string;
    createdBy: string;
    sections?: Parameters<TemplatesRepository["replaceSectionsAndQuestions"]>[1];
  }) {
    const template = await this.templatesRepo.create({
      name: dto.name,
      description: dto.description,
      recipientType: dto.recipientType,
      status: "Draft",
      createdBy: dto.createdBy,
      updatedBy: dto.createdBy,
    });

    if (dto.sections?.length) {
      await this.templatesRepo.replaceSectionsAndQuestions(template.templateId, dto.sections);
    }

    return this.getById(template.templateId);
  }

  async replace(templateId: string, dto: {
    name: string;
    description?: string;
    recipientType?: string;
    updatedBy: string;
    sections: Parameters<TemplatesRepository["replaceSectionsAndQuestions"]>[1];
  }) {
    const existing = await this.templatesRepo.findById(templateId);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Template not found");

    const previousFull = await this.getById(templateId);
    const systemQuestionLabels = new Set(
      previousFull.sections
        .flatMap((s) => s.questions)
        .filter((q) => q.systemControlled)
        .map((q) => q.label)
    );

    for (const section of dto.sections) {
      for (const question of section.questions) {
        if (question.systemControlled && !systemQuestionLabels.has(question.label as string)) {
          throw new AppError(400, "VALIDATION_ERROR", "System-controlled questions cannot be removed");
        }
      }
    }

    for (const label of systemQuestionLabels) {
      const stillPresent = dto.sections.some((s) =>
        s.questions.some((q) => q.label === label)
      );
      if (!stillPresent) {
        throw new AppError(400, "VALIDATION_ERROR", `System-controlled question "${label}" cannot be removed`);
      }
    }

    const full = previousFull;
    await this.templatesRepo.saveSnapshot(templateId, existing.version, full);

    const updated = await this.templatesRepo.update(templateId, {
      name: dto.name,
      description: dto.description,
      recipientType: dto.recipientType,
      updatedBy: dto.updatedBy,
      version: existing.version + 1,
    });

    await this.templatesRepo.replaceSectionsAndQuestions(templateId, dto.sections);
    return this.getById(updated.templateId);
  }

  async updateStatus(templateId: string, status: "Active" | "Draft", updatedBy: string) {
    const existing = await this.templatesRepo.findById(templateId);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Template not found");

    if (status === "Active") {
      const full = await this.getById(templateId);
      if (!full.sections.length) {
        throw new AppError(400, "VALIDATION_ERROR", "Cannot activate a template with no sections");
      }
      const allQuestions = full.sections.flatMap((s) => s.questions);
      if (!allQuestions.length) {
        throw new AppError(400, "VALIDATION_ERROR", "Cannot activate a template with no questions");
      }
      if (!allQuestions.some((q) => q.mandatory)) {
        throw new AppError(400, "VALIDATION_ERROR", "Cannot activate a template without mandatory questions");
      }
    }

    await this.templatesRepo.update(templateId, { status, updatedBy });
    return this.getById(templateId);
  }

  async delete(templateId: string) {
    const existing = await this.templatesRepo.findById(templateId);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Template not found");
    if (existing.status !== "Draft") {
      throw new AppError(400, "VALIDATION_ERROR", "Only draft templates can be deleted");
    }
    await this.templatesRepo.delete(templateId);
  }
}
