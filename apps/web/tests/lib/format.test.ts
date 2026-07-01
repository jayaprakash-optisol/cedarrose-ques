import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { absTime, isStale, relTime } from "@/lib/format";

describe("format", () => {
  const NOW = new Date("2026-06-15T12:00:00.000Z");

  beforeEach(() => {
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("relTime", () => {
    it("returns an em-dash when iso is undefined", () => {
      expect(relTime(undefined)).toBe("—");
    });

    it("returns 'just now' for timestamps within the last minute", () => {
      const iso = new Date(NOW.getTime() - 5_000).toISOString();
      expect(relTime(iso)).toBe("just now");
    });

    it("returns 'in X' for a future timestamp", () => {
      const iso = new Date(NOW.getTime() + 60 * 60 * 1000).toISOString();
      expect(relTime(iso)).toMatch(/^in /);
    });

    it("returns 'X ago' for timestamps within the last day", () => {
      const iso = new Date(NOW.getTime() - 2 * 60 * 60 * 1000).toISOString();
      expect(relTime(iso)).toMatch(/ago/);
    });

    it("returns 'X ago' for timestamps within the last week", () => {
      const iso = new Date(NOW.getTime() - 3 * 86_400_000).toISOString();
      expect(relTime(iso)).toMatch(/ago/);
    });

    it("returns formatted date for older timestamps", () => {
      const iso = new Date(NOW.getTime() - 10 * 86_400_000).toISOString();
      const out = relTime(iso);
      expect(out).toMatch(/^\d{2} [A-Za-z]{3} \d{4} at \d{2}:\d{2}$/);
    });
  });

  describe("absTime", () => {
    it("returns an em-dash when iso is undefined", () => {
      expect(absTime(undefined)).toBe("—");
    });

    it("formats the date with day/month/year and time", () => {
      const iso = "2026-06-15T10:30:00.000Z";
      const out = absTime(iso);
      expect(out).toMatch(/\d{2} [A-Za-z]{3} \d{4}, \d{2}:\d{2}/);
    });
  });

  describe("isStale", () => {
    it("returns true for an iso older than the default threshold (72h)", () => {
      const iso = new Date(NOW.getTime() - 73 * 3600_000).toISOString();
      expect(isStale(iso)).toBe(true);
    });

    it("returns false for an iso within the default threshold", () => {
      const iso = new Date(NOW.getTime() - 1 * 3600_000).toISOString();
      expect(isStale(iso)).toBe(false);
    });

    it("honours a custom hours threshold (falsy for very old)", () => {
      const iso = new Date(NOW.getTime() - 100 * 3600_000).toISOString();
      expect(isStale(iso, 200)).toBe(false);
    });

    it("returns true when custom threshold is exceeded", () => {
      const iso = new Date(NOW.getTime() - 100 * 3600_000).toISOString();
      expect(isStale(iso, 50)).toBe(true);
    });
  });
});
