import { describe, it, expect } from "vitest";
import { delay, normalizeMockDates } from "@/services/mock/utils";

describe("mock utils", () => {
  it("delay resolves after timeout", async () => {
    const start = Date.now();
    await delay(50);
    expect(Date.now() - start).toBeGreaterThanOrEqual(40);
  });

  it("normalizeMockDates shifts recent ISO timestamps", () => {
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const [row] = normalizeMockDates([{ createdAt: weekAgo, name: "x" }], ["createdAt"]);
    const shifted = new Date(row.createdAt).getTime();
    expect(Math.abs(shifted - (Date.now() - 7 * 86_400_000))).toBeLessThan(5000);
    expect(row.name).toBe("x");
  });
});
