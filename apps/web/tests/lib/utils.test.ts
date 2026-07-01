import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("utils", () => {
  describe("cn", () => {
    it("merges class names", () => {
      expect(cn("foo", "bar")).toBe("foo bar");
    });

    it("ignores falsy values", () => {
      expect(cn("foo", false, undefined, null, 0, "", "bar")).toBe("foo bar");
    });

    it("dedupes tailwind utilities (last wins)", () => {
      expect(cn("p-2", "p-4")).toBe("p-4");
    });

    it("keeps conflicting utilities that are not the same property", () => {
      expect(cn("p-2", "m-4")).toBe("p-2 m-4");
    });

    it("handles arrays and objects from clsx", () => {
      expect(cn(["foo", "bar"], { baz: true, qux: false })).toBe("foo bar baz");
    });
  });
});
