import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { authorize } from "../../../src/middleware/authorize.js";
import { AppError } from "../../../src/shared/errors/AppError.js";
import { createMockUser } from "../../helpers/mock-user.js";

describe("authorize middleware", () => {
  const next = vi.fn() as NextFunction;

  it("requires authentication", () => {
    const req = {} as Request;
    authorize("Admin")(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it("blocks users without required role", () => {
    const req = { user: createMockUser({ role: "Analyst" }) } as Request;
    authorize("Admin")(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it("allows matching role", () => {
    const req = { user: createMockUser({ role: "Admin" }) } as Request;
    const localNext = vi.fn() as NextFunction;
    authorize("Admin")(req, {} as Response, localNext);
    expect(localNext).toHaveBeenCalledOnce();
  });
});
