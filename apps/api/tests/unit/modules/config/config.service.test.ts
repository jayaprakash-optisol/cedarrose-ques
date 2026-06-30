import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConfigService } from "../../../../src/modules/config/config.service.js";
import type { ConfigRepository } from "../../../../src/modules/config/config.repository.js";
import { createMockConfigRepository } from "../../../helpers/mock-repositories.js";

function createMockConfig() {
  return {
    configId: "55555555-5555-5555-5555-555555555555",
    linkValidityDays: 10,
    tokenType: "single-use",
    tokenExpiryValue: 30,
    tokenExpiryUnit: "minutes",
    otpLength: 6,
    otpExpiryMinutes: 10,
    otpMaxAttempts: 3,
    reminder1Day: 3,
    reminder2Day: 5,
    reminderFinalDay: 7,
    expiryDay: 10,
    gamificationEnabled: true,
    tier1Label: null,
    tier1Description: null,
    tier2Label: null,
    tier2Description: null,
    autoProcessA: true,
    manualProcessB: false,
    alertCd: true,
    auditRetentionDays: 365,
    exportFormat: "csv",
    staleHours: 72,
    updatedBy: null,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

describe("ConfigService", () => {
  let repo: ReturnType<typeof createMockConfigRepository>;
  let service: ConfigService;

  beforeEach(() => {
    repo = createMockConfigRepository();
    service = new ConfigService(repo as unknown as ConfigRepository);
  });

  describe("get", () => {
    it("throws when config is missing", async () => {
      vi.mocked(repo.get).mockResolvedValue(null);
      await expect(service.get()).rejects.toMatchObject({
        statusCode: 404,
        message: "Platform config not found",
      });
    });

    it("returns platform config", async () => {
      const config = createMockConfig();
      vi.mocked(repo.get).mockResolvedValue(config);
      await expect(service.get()).resolves.toEqual(config);
    });
  });

  describe("replace", () => {
    it("delegates to repository with updatedBy", async () => {
      const config = createMockConfig();
      const payload = { staleHours: 96 };
      vi.mocked(repo.replace).mockResolvedValue({ ...config, staleHours: 96 });

      const result = await service.replace(payload, "11111111-1111-1111-1111-111111111111");

      expect(repo.replace).toHaveBeenCalledWith(payload, "11111111-1111-1111-1111-111111111111");
      expect(result.staleHours).toBe(96);
    });
  });
});
