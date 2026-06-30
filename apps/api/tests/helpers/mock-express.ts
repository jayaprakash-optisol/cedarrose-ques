import { vi } from "vitest";
import type { Request, Response } from "express";
import type { UserRow } from "../../src/db/schema/users.js";
import { createMockUser } from "./mock-user.js";

export function createMockResponse() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    statusCode: 200,
  };
  return res as unknown as Response & typeof res;
}

export function createMockRequest(overrides: Partial<Request> & { user?: UserRow } = {}) {
  return {
    body: {},
    query: {},
    params: {},
    headers: {},
    cookies: {},
    user: createMockUser(),
    id: "req-test",
    method: "GET",
    originalUrl: "/test",
    ...overrides,
  } as Request;
}
