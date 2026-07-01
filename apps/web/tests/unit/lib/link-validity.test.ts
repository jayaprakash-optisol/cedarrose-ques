import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatLinkValidityLabel,
  projectedLinkExpiry,
  formatLinkExpiryDate,
} from "@/lib/link-validity";

describe("link-validity", () => {
  describe("formatLinkValidityLabel", () => {
    it("formats whole days", () => {
      expect(formatLinkValidityLabel(24)).toBe("1 day");
      expect(formatLinkValidityLabel(48)).toBe("2 days");
      expect(formatLinkValidityLabel(72)).toBe("3 days");
    });

    it("formats partial-day hours", () => {
      expect(formatLinkValidityLabel(1)).toBe("1 hour");
      expect(formatLinkValidityLabel(12)).toBe("12 hours");
      expect(formatLinkValidityLabel(36)).toBe("36 hours");
    });
  });

  describe("projectedLinkExpiry", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("projects a future date based on the provided hours", () => {
      expect(projectedLinkExpiry(24)).toBe("16 Jan 2026");
      expect(projectedLinkExpiry(72)).toBe("18 Jan 2026");
    });

    it("accepts a custom from date", () => {
      expect(projectedLinkExpiry(48, new Date("2026-06-01T00:00:00.000Z"))).toBe("03 Jun 2026");
    });
  });

  describe("formatLinkExpiryDate", () => {
    it("returns em-dash for null/undefined", () => {
      expect(formatLinkExpiryDate(null)).toBe("—");
      expect(formatLinkExpiryDate(undefined)).toBe("—");
    });

    it("formats ISO date strings", () => {
      expect(formatLinkExpiryDate("2026-01-15T10:30:00.000Z")).toBe("15 Jan 2026");
    });
  });
});
