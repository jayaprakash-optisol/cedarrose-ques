import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { relTime, absTime, isStale } from "@/lib/format";

describe("format utils", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-30T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats absolute timestamps", () => {
    expect(absTime(undefined)).toBe("—");
    expect(absTime("2026-01-15T10:30:00.000Z")).toContain("2026");
  });

  it("returns dash for missing relative time", () => {
    expect(relTime(undefined)).toBe("—");
  });

  it("returns just now for very recent timestamps", () => {
    const recent = new Date("2026-06-30T11:59:30.000Z").toISOString();
    expect(relTime(recent)).toBe("just now");
  });

  it("returns relative time for same-day activity", () => {
    const earlier = new Date("2026-06-30T10:00:00.000Z").toISOString();
    expect(relTime(earlier)).toMatch(/hour/i);
  });

  it("returns relative time for multi-day activity within a week", () => {
    const daysAgo = new Date("2026-06-27T12:00:00.000Z").toISOString();
    expect(relTime(daysAgo)).toMatch(/day/i);
  });

  it("returns absolute format for older timestamps", () => {
    const old = new Date("2026-01-01T10:00:00.000Z").toISOString();
    expect(relTime(old)).toContain("2026");
  });

  it("handles future timestamps", () => {
    const future = new Date("2026-07-01T12:00:00.000Z").toISOString();
    expect(relTime(future)).toMatch(/^in /);
  });

  it("detects stale activity", () => {
    const old = new Date(Date.now() - 80 * 3600_000).toISOString();
    expect(isStale(old, 72)).toBe(true);
    const recent = new Date().toISOString();
    expect(isStale(recent, 72)).toBe(false);
  });
});
