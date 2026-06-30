import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConfigController } from "../../../../src/modules/config/config.controller.js";
import type { ConfigService } from "../../../../src/modules/config/config.service.js";
import { createMockRequest, createMockResponse } from "../../../helpers/mock-express.js";
import { createMockUser } from "../../../helpers/mock-user.js";

describe("ConfigController", () => {
  let configService: ConfigService;
  let controller: ConfigController;
  let res: ReturnType<typeof createMockResponse>;

  const mockConfig = { reminderDays: 3, staleDays: 7 };

  beforeEach(() => {
    configService = {
      get: vi.fn(),
      replace: vi.fn(),
    } as unknown as ConfigService;

    controller = new ConfigController(configService);
    res = createMockResponse();
  });

  describe("get", () => {
    it("returns current config", async () => {
      vi.mocked(configService.get).mockResolvedValue(mockConfig);
      const req = createMockRequest();

      await controller.get(req, res);

      expect(configService.get).toHaveBeenCalledOnce();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockConfig }));
    });
  });

  describe("replace", () => {
    it("replaces config and returns updated data", async () => {
      const user = createMockUser();
      const body = { reminderDays: 5 };
      vi.mocked(configService.replace).mockResolvedValue({ ...mockConfig, ...body });
      const req = createMockRequest({ user, body });

      await controller.replace(req, res);

      expect(configService.replace).toHaveBeenCalledWith(body, user.userId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Config updated" })
      );
    });
  });
});
