import { describe, it, expect, beforeEach } from "vitest";
import { ConfigRepository } from "../../../../src/modules/config/config.repository.js";
import { createMockDrizzle } from "../../../helpers/mock-drizzle.js";

describe("ConfigRepository", () => {
  let db: ReturnType<typeof createMockDrizzle>;
  let repo: ConfigRepository;

  const configRow = {
    configId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
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
    updatedBy: "11111111-1111-1111-1111-111111111111",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  beforeEach(() => {
    db = createMockDrizzle();
    repo = new ConfigRepository(db as never);
  });

  it("get returns config row or null", async () => {
    db.queueResults([configRow]);
    await expect(repo.get()).resolves.toEqual(configRow);

    db.queueResults([]);
    await expect(repo.get()).resolves.toBeNull();
  });

  it("replace inserts when no config exists", async () => {
    db.queueResults([], configRow);
    await expect(
      repo.replace({ linkValidityDays: 14 }, "11111111-1111-1111-1111-111111111111")
    ).resolves.toEqual(configRow);
    expect(db.insert).toHaveBeenCalled();
  });

  it("replace updates when config exists", async () => {
    const updated = { ...configRow, linkValidityDays: 21 };
    db.queueResults([configRow], updated);
    await expect(
      repo.replace({ linkValidityDays: 21 }, "11111111-1111-1111-1111-111111111111")
    ).resolves.toEqual(updated);
    expect(db.update).toHaveBeenCalled();
  });
});
