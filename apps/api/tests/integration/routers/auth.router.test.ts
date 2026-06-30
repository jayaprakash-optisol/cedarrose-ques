import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { authRouter } from "../../../src/modules/auth/auth.router.js";
import { AuthController } from "../../../src/modules/auth/auth.controller.js";
import type { AuthService } from "../../../src/modules/auth/auth.service.js";
import { errorHandler } from "../../../src/middleware/error-handler.js";
import { createMockUser } from "../../helpers/mock-user.js";

function createMockAuthService(): AuthService {
  return {
    validateUser: vi.fn(),
    generateAccessToken: vi.fn().mockReturnValue("access-token"),
    generateRefreshToken: vi.fn().mockResolvedValue("refresh-token"),
    validateRefreshToken: vi.fn(),
    findById: vi.fn(),
    revokeRefreshToken: vi.fn(),
    changePassword: vi.fn(),
    generateResetToken: vi.fn(),
    resetPassword: vi.fn(),
    verifyInvitation: vi.fn(),
    verifyResetToken: vi.fn(),
    completeRegistration: vi.fn(),
    stripPassword: vi.fn((user) => {
      const { password: _password, ...rest } = user;
      return rest;
    }),
  } as unknown as AuthService;
}

function createAuthApp(service: AuthService, user?: ReturnType<typeof createMockUser>) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  if (user) {
    app.use((req, _res, next) => {
      req.user = user;
      next();
    });
  }
  app.use("/api/v1/auth", authRouter(new AuthController(service)));
  app.use(errorHandler);
  return app;
}

describe("auth router", () => {
  let service: ReturnType<typeof createMockAuthService>;

  beforeEach(() => {
    service = createMockAuthService();
  });

  it("POST /login returns 401 for invalid credentials", async () => {
    vi.mocked(service.validateUser).mockResolvedValue(null);
    const app = createAuthApp(service);

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "bad@test.com", password: "wrong" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("POST /login returns user and token for valid credentials", async () => {
    const user = createMockUser();
    vi.mocked(service.validateUser).mockResolvedValue(user);

    const app = createAuthApp(service);
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: user.email, password: "Password123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBe("access-token");
    expect(service.generateAccessToken).toHaveBeenCalledWith(user);
  });

  it("POST /login returns 422 for invalid body", async () => {
    const app = createAuthApp(service);
    const res = await request(app).post("/api/v1/auth/login").send({ email: "not-an-email" });
    expect(res.status).toBe(422);
  });

  it("POST /logout clears session", async () => {
    const app = createAuthApp(service);
    const res = await request(app)
      .post("/api/v1/auth/logout")
      .send({ refreshToken: "refresh-token" });

    expect(res.status).toBe(200);
    expect(service.revokeRefreshToken).toHaveBeenCalledWith("refresh-token");
  });

  it("GET /me requires authentication", async () => {
    const app = createAuthApp(service);
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });

  it("POST /forgot-password accepts valid email", async () => {
    const app = createAuthApp(service);
    const res = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "analyst@cedarrose.local" });

    expect(res.status).toBe(200);
    expect(service.generateResetToken).toHaveBeenCalledWith("analyst@cedarrose.local");
  });
});
