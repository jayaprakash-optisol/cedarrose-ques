import { describe, expect, it } from "vitest";
import {
  formatLinkExpiryDate,
  formatLinkValidityLabel,
  projectedLinkExpiry,
} from "@/lib/link-validity";

describe("link-validity", () => {
  describe("formatLinkValidityLabel", () => {
    it("returns '1 day' for exactly 24 hours", () => {
      expect(formatLinkValidityLabel(24)).toBe("1 day");
    });

    it("returns 'N days' for any multiple of 24", () => {
      expect(formatLinkValidityLabel(48)).toBe("2 days");
      expect(formatLinkValidityLabel(72)).toBe("3 days");
      expect(formatLinkValidityLabel(168)).toBe("7 days");
    });

    it("returns '1 hour' for 1 hour", () => {
      expect(formatLinkValidityLabel(1)).toBe("1 hour");
    });

    it("returns 'N hours' for non-multiples of 24", () => {
      expect(formatLinkValidityLabel(2)).toBe("2 hours");
      expect(formatLinkValidityLabel(5)).toBe("5 hours");
      expect(formatLinkValidityLabel(25)).toBe("25 hours");
    });
  });

  describe("projectedLinkExpiry", () => {
    it("returns a date string 24h in the future when from is provided", () => {
      const from = new Date("2026-06-01T09:00:00.000Z");
      const out = projectedLinkExpiry(24, from);
      expect(out).toMatch(/^\d{2} [A-Za-z]{3} \d{4}$/);
    });

    it("defaults to now when from is omitted", () => {
      const out = projectedLinkExpiry(48);
      expect(out).toMatch(/^\d{2} [A-Za-z]{3} \d{4}$/);
    });
  });

  describe("formatLinkExpiryDate", () => {
    it("returns an em-dash when iso is null", () => {
      expect(formatLinkExpiryDate(null)).toBe("—");
    });

    it("returns an em-dash when iso is undefined", () => {
      expect(formatLinkExpiryDate(undefined)).toBe("—");
    });

    it("formats a valid iso", () => {
      const out = formatLinkExpiryDate("2026-06-03T09:00:00.000Z");
      expect(out).toMatch(/^\d{2} [A-Za-z]{3} \d{4}$/);
    });
  });
});
