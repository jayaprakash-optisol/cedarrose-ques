import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { ZodError, z } from "zod";
import { errorHandler } from "../../../src/middleware/error-handler.js";
import { AppError } from "../../../src/shared/errors/AppError.js";

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;
}

describe("errorHandler", () => {
  const req = { method: "GET", originalUrl: "/test", id: "req-1" } as Request;
  const next = vi.fn() as NextFunction;

  it("handles AppError", () => {
    const res = mockRes();
    errorHandler(new AppError(404, "NOT_FOUND", "missing"), req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("handles ZodError as 422", () => {
    const res = mockRes();
    const err = new ZodError([{ code: "custom", message: "bad", path: ["email"] }]);
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it("handles invalid JSON syntax", () => {
    const res = mockRes();
    const err = new SyntaxError("bad json");
    Object.assign(err, { body: true });
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("handles unknown errors as 500", () => {
    const res = mockRes();
    errorHandler(new Error("boom"), req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("logs AppError with status >= 500", () => {
    const res = mockRes();
    errorHandler(new AppError(502, "EMAIL_SEND_FAILED", "smtp down"), req, res, next);
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: expect.objectContaining({ code: "EMAIL_SEND_FAILED" }) })
    );
  });

  it("handles database errors", () => {
    const res = mockRes();
    const err = new Error("db fail", { cause: { code: "23502" } });
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: "MISSING_REQUIRED_FIELD" }) })
    );
  });
});
