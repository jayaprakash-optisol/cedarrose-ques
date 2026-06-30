import { describe, it, expect, beforeEach, vi } from "vitest";
import { TemplatesController } from "../../../../src/modules/templates/templates.controller.js";
import type { TemplatesService } from "../../../../src/modules/templates/templates.service.js";
import { createMockRequest, createMockResponse } from "../../../helpers/mock-express.js";
import { createMockUser } from "../../../helpers/mock-user.js";

describe("TemplatesController", () => {
  let templatesService: TemplatesService;
  let controller: TemplatesController;
  let res: ReturnType<typeof createMockResponse>;

  const mockTemplate = { templateId: "tpl-1", name: "Default", status: "Active" };

  beforeEach(() => {
    templatesService = {
      list: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      replace: vi.fn(),
      updateStatus: vi.fn(),
      delete: vi.fn(),
    } as unknown as TemplatesService;

    controller = new TemplatesController(templatesService);
    res = createMockResponse();
  });

  describe("list", () => {
    it("returns all templates", async () => {
      vi.mocked(templatesService.list).mockResolvedValue([mockTemplate]);
      const req = createMockRequest();

      await controller.list(req, res);

      expect(templatesService.list).toHaveBeenCalledOnce();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [mockTemplate] }));
    });
  });

  describe("getById", () => {
    it("returns a template by id", async () => {
      vi.mocked(templatesService.getById).mockResolvedValue(mockTemplate);
      const req = createMockRequest({ params: { id: "tpl-1" } });

      await controller.getById(req, res);

      expect(templatesService.getById).toHaveBeenCalledWith("tpl-1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockTemplate }));
    });
  });

  describe("create", () => {
    it("creates a template and returns 201", async () => {
      const user = createMockUser();
      const body = { name: "New Template", sections: [] };
      vi.mocked(templatesService.create).mockResolvedValue(mockTemplate);
      const req = createMockRequest({ user, body });

      await controller.create(req, res);

      expect(templatesService.create).toHaveBeenCalledWith({
        ...body,
        createdBy: user.userId,
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: mockTemplate, message: "Template created" })
      );
    });
  });

  describe("replace", () => {
    it("replaces a template", async () => {
      const user = createMockUser();
      const body = { name: "Updated Template", sections: [] };
      vi.mocked(templatesService.replace).mockResolvedValue(mockTemplate);
      const req = createMockRequest({ user, params: { id: "tpl-1" }, body });

      await controller.replace(req, res);

      expect(templatesService.replace).toHaveBeenCalledWith("tpl-1", {
        ...body,
        updatedBy: user.userId,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Template updated" })
      );
    });
  });

  describe("updateStatus", () => {
    it("updates template status", async () => {
      const user = createMockUser();
      vi.mocked(templatesService.updateStatus).mockResolvedValue(mockTemplate);
      const req = createMockRequest({
        user,
        params: { id: "tpl-1" },
        body: { status: "Draft" },
      });

      await controller.updateStatus(req, res);

      expect(templatesService.updateStatus).toHaveBeenCalledWith("tpl-1", "Draft", user.userId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Template status updated" })
      );
    });
  });

  describe("delete", () => {
    it("deletes a template", async () => {
      const req = createMockRequest({ params: { id: "tpl-1" } });

      await controller.delete(req, res);

      expect(templatesService.delete).toHaveBeenCalledWith("tpl-1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Template deleted" })
      );
    });
  });
});
