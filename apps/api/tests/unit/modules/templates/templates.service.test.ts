import { describe, it, expect, beforeEach, vi } from "vitest";
import { TemplatesService } from "../../../../src/modules/templates/templates.service.js";
import { createMockTemplatesRepository } from "../../../helpers/mock-repositories.js";

const templateId = "33333333-3333-3333-3333-333333333333";
const userId = "11111111-1111-1111-1111-111111111111";

function createTemplateRow(overrides: Record<string, unknown> = {}) {
  return {
    templateId,
    name: "Supplier Template",
    description: "Desc",
    status: "Draft",
    recipientType: "Supplier",
    version: 1,
    createdBy: userId,
    updatedBy: userId,
    lastEditedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createFullTemplate(overrides: Record<string, unknown> = {}) {
  return {
    ...createTemplateRow(),
    sections: [
      {
        sectionId: "s1",
        templateId,
        title: "General",
        orderIndex: 0,
        questions: [
          {
            questionId: "q1",
            sectionId: "s1",
            label: "Company name",
            type: "text",
            mandatory: true,
            systemControlled: true,
            orderIndex: 0,
          },
          {
            questionId: "q2",
            sectionId: "s1",
            label: "Revenue",
            type: "number",
            mandatory: false,
            systemControlled: false,
            orderIndex: 1,
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("TemplatesService", () => {
  let repo: ReturnType<typeof createMockTemplatesRepository>;
  let service: TemplatesService;

  beforeEach(() => {
    repo = createMockTemplatesRepository();
    service = new TemplatesService(repo);
  });

  describe("list", () => {
    it("returns template summaries", async () => {
      const summaries = [{ templateId, name: "Supplier Template" }];
      vi.mocked(repo.findAllSummaries).mockResolvedValue(summaries as never);
      await expect(service.list()).resolves.toEqual(summaries);
    });
  });

  describe("getById", () => {
    it("throws when template is missing", async () => {
      vi.mocked(repo.getFullTemplate).mockResolvedValue(null);
      await expect(service.getById(templateId)).rejects.toMatchObject({
        statusCode: 404,
        message: "Template not found",
      });
    });
  });

  describe("create", () => {
    it("creates draft template and optional sections", async () => {
      const row = createTemplateRow();
      const full = createFullTemplate();
      vi.mocked(repo.create).mockResolvedValue(row);
      vi.mocked(repo.getFullTemplate).mockResolvedValue(full);

      const sections = [{ title: "General", orderIndex: 0, questions: [] }];
      const result = await service.create({
        name: "Supplier Template",
        recipientType: "Supplier",
        createdBy: userId,
        sections,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: "Draft", recipientType: "Supplier" }),
      );
      expect(repo.replaceSectionsAndQuestions).toHaveBeenCalledWith(templateId, sections);
      expect(result).toEqual(full);
    });
  });

  describe("replace", () => {
    it("throws when template is missing", async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);
      await expect(
        service.replace(templateId, {
          name: "X",
          updatedBy: userId,
          sections: [],
        }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("rejects removal of system-controlled questions", async () => {
      const existing = createTemplateRow();
      const full = createFullTemplate();
      vi.mocked(repo.findById).mockResolvedValue(existing);
      vi.mocked(repo.getFullTemplate).mockResolvedValue(full);

      await expect(
        service.replace(templateId, {
          name: "Updated",
          updatedBy: userId,
          sections: [
            {
              title: "General",
              orderIndex: 0,
              questions: [
                {
                  label: "New system q",
                  type: "text",
                  mandatory: true,
                  systemControlled: true,
                  orderIndex: 0,
                },
              ],
            },
          ],
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "System-controlled questions cannot be removed",
      });
    });

    it("rejects when existing system question label is removed", async () => {
      const existing = createTemplateRow();
      const full = createFullTemplate();
      vi.mocked(repo.findById).mockResolvedValue(existing);
      vi.mocked(repo.getFullTemplate).mockResolvedValue(full);

      await expect(
        service.replace(templateId, {
          name: "Updated",
          updatedBy: userId,
          sections: [
            {
              title: "General",
              orderIndex: 0,
              questions: [
                {
                  label: "Revenue",
                  type: "number",
                  mandatory: false,
                  systemControlled: false,
                  orderIndex: 0,
                },
              ],
            },
          ],
        }),
      ).rejects.toMatchObject({
        message: expect.stringContaining('System-controlled question "Company name" cannot be removed'),
      });
    });

    it("saves snapshot, bumps version, and replaces sections on success", async () => {
      const existing = createTemplateRow({ version: 2 });
      const full = createFullTemplate();
      const updated = createTemplateRow({ version: 3 });
      const newFull = createFullTemplate({ version: 3 });
      vi.mocked(repo.findById).mockResolvedValue(existing);
      vi.mocked(repo.getFullTemplate).mockResolvedValueOnce(full).mockResolvedValueOnce(newFull);
      vi.mocked(repo.update).mockResolvedValue(updated);

      const sections = full.sections;
      const result = await service.replace(templateId, {
        name: "Updated",
        updatedBy: userId,
        sections,
      });

      expect(repo.saveSnapshot).toHaveBeenCalledWith(templateId, 2, full);
      expect(repo.update).toHaveBeenCalledWith(
        templateId,
        expect.objectContaining({ version: 3 }),
      );
      expect(repo.replaceSectionsAndQuestions).toHaveBeenCalledWith(templateId, sections);
      expect(result.version).toBe(3);
    });
  });

  describe("updateStatus", () => {
    it("throws when template is missing", async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);
      await expect(service.updateStatus(templateId, "Active", userId)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("rejects activation without sections", async () => {
      vi.mocked(repo.findById).mockResolvedValue(createTemplateRow());
      vi.mocked(repo.getFullTemplate).mockResolvedValue(createFullTemplate({ sections: [] }));

      await expect(service.updateStatus(templateId, "Active", userId)).rejects.toMatchObject({
        message: "Cannot activate a template with no sections",
      });
    });

    it("rejects activation without mandatory questions", async () => {
      const full = createFullTemplate({
        sections: [
          {
            sectionId: "s1",
            templateId,
            title: "General",
            orderIndex: 0,
            questions: [
              {
                questionId: "q1",
                sectionId: "s1",
                label: "Optional",
                type: "text",
                mandatory: false,
                systemControlled: false,
                orderIndex: 0,
              },
            ],
          },
        ],
      });
      vi.mocked(repo.findById).mockResolvedValue(createTemplateRow());
      vi.mocked(repo.getFullTemplate).mockResolvedValue(full);

      await expect(service.updateStatus(templateId, "Active", userId)).rejects.toMatchObject({
        message: "Cannot activate a template without mandatory questions",
      });
    });

    it("activates valid template", async () => {
      const existing = createTemplateRow();
      const full = createFullTemplate({ status: "Active" });
      vi.mocked(repo.findById).mockResolvedValue(existing);
      vi.mocked(repo.getFullTemplate).mockResolvedValue(full);
      vi.mocked(repo.update).mockResolvedValue({ ...existing, status: "Active" });

      const result = await service.updateStatus(templateId, "Active", userId);

      expect(repo.update).toHaveBeenCalledWith(templateId, { status: "Active", updatedBy: userId });
      expect(result.status).toBe("Active");
    });
  });

  describe("delete", () => {
    it("only allows deleting draft templates", async () => {
      vi.mocked(repo.findById).mockResolvedValue(createTemplateRow({ status: "Active" }));
      await expect(service.delete(templateId)).rejects.toMatchObject({
        message: "Only draft templates can be deleted",
      });
    });

    it("deletes draft template", async () => {
      vi.mocked(repo.findById).mockResolvedValue(createTemplateRow({ status: "Draft" }));
      await service.delete(templateId);
      expect(repo.delete).toHaveBeenCalledWith(templateId);
    });
  });
});
