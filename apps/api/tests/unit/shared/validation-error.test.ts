import { describe, it, expect } from "vitest";
import { z } from "zod";
import { formatZodError } from "../../../src/shared/utils/validation-error.js";

describe("formatZodError", () => {
  it("formats zod issues into a single message", () => {
    const schema = z.object({ email: z.string().email() });
    try {
      schema.parse({ email: "bad" });
    } catch (err) {
      expect(formatZodError(err as z.ZodError)).toContain("email:");
    }
  });

  it("uses request label when issue path is empty", () => {
    try {
      z.string().parse(123);
    } catch (err) {
      expect(formatZodError(err as z.ZodError)).toContain("request:");
    }
  });
});
