import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges tailwind classes", () => {
    expect(cn("px-2", "px-4", false && "hidden", "text-sm")).toBe("px-4 text-sm");
  });
});
