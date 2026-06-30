import { describe, it, expect } from "vitest";
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { vi } from "vitest";
import { validate } from "../../../src/middleware/validate.js";

describe("validate middleware", () => {
  const schema = z.object({
    email: z.string().email(),
  });

  it("parses valid input and calls next", () => {
    const req = { body: { email: "a@b.com" }, id: "req-1" } as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    validate(schema)(req, res, next);

    expect(req.body.email).toBe("a@b.com");
    expect(next).toHaveBeenCalledOnce();
  });

  it("returns 422 for invalid input", () => {
    const req = { body: { email: "bad" }, id: "req-1" } as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    validate(schema)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(next).not.toHaveBeenCalled();
  });

  it("forwards unexpected errors to error handler", () => {
    const brokenSchema = {
      parse: () => {
        throw new Error("boom");
      },
    };
    const req = { body: {}, id: "req-1" } as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    validate(brokenSchema as never)(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});
