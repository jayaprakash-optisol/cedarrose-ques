import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getDb } from "../../../src/config/database.js";
import { authenticate } from "../../../src/middleware/authenticate.js";
import { createMockUser } from "../../helpers/mock-user.js";
import { createMockDrizzle } from "../../helpers/mock-drizzle.js";

vi.mock("jsonwebtoken", () => ({
  default: {
    verify: vi.fn(),
    JsonWebTokenError: class JsonWebTokenError extends Error {
      constructor(message = "invalid token") {
        super(message);
        this.name = "JsonWebTokenError";
      }
    },
  },
}));

vi.mock("../../../src/config/database.js", () => ({
  getDb: vi.fn(),
}));

describe("authenticate middleware", () => {
  const next = vi.fn() as NextFunction;

  function createRes() {
    return {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when Authorization header is missing", async () => {
    const req = { headers: {} } as Request;
    const res = createRes();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Authentication token missing" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when token payload is incomplete", async () => {
    vi.mocked(jwt.verify).mockReturnValue({ sub: "user-id" } as never);
    const req = { headers: { authorization: "Bearer token" } } as Request;
    const res = createRes();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Invalid token format" });
  });

  it("returns 401 when user is not found in database", async () => {
    const user = createMockUser();
    vi.mocked(jwt.verify).mockReturnValue({
      sub: user.userId,
      email: user.email,
      role: user.role,
    } as never);

    const db = createMockDrizzle();
    db.queueResults([]);
    vi.mocked(getDb).mockReturnValue(db as never);

    const req = { headers: { authorization: "Bearer token" } } as Request;
    const res = createRes();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Invalid authentication token" });
  });

  it("returns 401 when token role does not match database role", async () => {
    const user = createMockUser({ role: "Analyst" });
    vi.mocked(jwt.verify).mockReturnValue({
      sub: user.userId,
      email: user.email,
      role: "Admin",
    } as never);

    const db = createMockDrizzle();
    db.queueResults([user]);
    vi.mocked(getDb).mockReturnValue(db as never);

    const req = { headers: { authorization: "Bearer token" } } as Request;
    const res = createRes();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "User role mismatch" });
  });

  it("attaches user and calls next for valid token", async () => {
    const user = createMockUser();
    vi.mocked(jwt.verify).mockReturnValue({
      sub: user.userId,
      email: user.email,
      role: user.role,
    } as never);

    const db = createMockDrizzle();
    db.queueResults([user]);
    vi.mocked(getDb).mockReturnValue(db as never);

    const req = { headers: { authorization: "Bearer valid-token" } } as Request;
    const res = createRes();

    await authenticate(req, res, next);

    expect(req.user).toEqual(user);
    expect(next).toHaveBeenCalledOnce();
  });

  it("returns 401 for JsonWebTokenError", async () => {
    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new jwt.JsonWebTokenError("bad");
    });

    const req = { headers: { authorization: "Bearer bad-token" } } as Request;
    const res = createRes();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Invalid authentication token" });
  });

  it("forwards unexpected errors to next", async () => {
    const boom = new Error("db down");
    vi.mocked(jwt.verify).mockReturnValue({
      sub: "id",
      email: "a@b.com",
      role: "Admin",
    } as never);
    vi.mocked(getDb).mockImplementation(() => {
      throw boom;
    });

    const req = { headers: { authorization: "Bearer token" } } as Request;
    const res = createRes();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(boom);
  });
});
