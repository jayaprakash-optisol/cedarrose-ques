import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { httpLogger } from "../../../src/middleware/http-logger.js";
import { logger } from "../../../src/config/logger.js";

vi.mock("../../../src/config/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("httpLogger middleware", () => {
  const next = vi.fn() as NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function runLogger(req: Partial<Request>, statusCode = 200) {
    const listeners: Record<string, () => void> = {};
    const res = {
      statusCode,
      on: vi.fn((event: string, cb: () => void) => {
        listeners[event] = cb;
        return res;
      }),
    } as unknown as Response;

    httpLogger(req as Request, res, next);
    listeners.finish?.();

    return { res };
  }

  it("skips logging for OPTIONS requests", () => {
    httpLogger({ method: "OPTIONS", originalUrl: "/api/v1/cases" } as Request, {} as Response, next);
    expect(next).toHaveBeenCalledOnce();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it("skips logging for health checks", () => {
    httpLogger({ method: "GET", originalUrl: "/health" } as Request, {} as Response, next);
    expect(next).toHaveBeenCalledOnce();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it("skips logging for swagger docs", () => {
    httpLogger({ method: "GET", originalUrl: "/api/docs/index.html" } as Request, {} as Response, next);
    expect(next).toHaveBeenCalledOnce();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it("logs info for successful responses", () => {
    runLogger({ method: "GET", originalUrl: "/api/v1/cases", id: "req-1" }, 200);
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: "req-1", statusCode: 200 }),
      expect.stringContaining("GET /api/v1/cases → 200")
    );
  });

  it("logs warn for client errors", () => {
    runLogger({ method: "POST", originalUrl: "/api/v1/auth/login", id: "req-2" }, 401);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: "req-2", statusCode: 401 }),
      expect.stringContaining("POST /api/v1/auth/login → 401")
    );
  });

  it("logs error for server errors", () => {
    runLogger({ method: "GET", originalUrl: "/api/v1/cases/1", id: "req-3" }, 500);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: "req-3", statusCode: 500 }),
      expect.stringContaining("GET /api/v1/cases/1 → 500")
    );
  });
});
