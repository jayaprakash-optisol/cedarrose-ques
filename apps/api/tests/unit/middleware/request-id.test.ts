import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { requestId } from "../../../src/middleware/request-id.js";

describe("requestId middleware", () => {
  it("uses incoming x-request-id header", () => {
    const req = { headers: { "x-request-id": "abc-123" } } as unknown as Request;
    const next = vi.fn() as NextFunction;
    requestId()(req, {} as Response, next);
    expect(req.id).toBe("abc-123");
    expect(next).toHaveBeenCalledOnce();
  });

  it("generates uuid when header missing", () => {
    const req = { headers: {} } as unknown as Request;
    const next = vi.fn() as NextFunction;
    requestId()(req, {} as Response, next);
    expect(req.id).toMatch(/^[0-9a-f-]{36}$/i);
  });
});
