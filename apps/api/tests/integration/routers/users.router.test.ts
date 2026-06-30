import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { usersRouter } from "../../../src/modules/users/users.router.js";
import { UsersController } from "../../../src/modules/users/users.controller.js";
import type { UsersService } from "../../../src/modules/users/users.service.js";
import { errorHandler } from "../../../src/middleware/error-handler.js";
import { createMockUser } from "../../helpers/mock-user.js";

function createMockUsersService(): UsersService {
  return {
    list: vi.fn(),
    inviteUser: vi.fn(),
    updateUser: vi.fn(),
    deactivate: vi.fn(),
    resendInvitation: vi.fn(),
    cancelInvitation: vi.fn(),
    exportAll: vi.fn(),
  } as unknown as UsersService;
}

function createUsersApp(service: UsersService, role = "Admin") {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = createMockUser({ role });
    next();
  });
  app.use("/api/v1/users", usersRouter(new UsersController(service)));
  app.use(errorHandler);
  return app;
}

describe("users router", () => {
  let service: ReturnType<typeof createMockUsersService>;

  beforeEach(() => {
    service = createMockUsersService();
  });

  it("GET / lists users", async () => {
    vi.mocked(service.list).mockResolvedValue({ data: [{ userId: "u-1" }], total: 1 } as never);
    const app = createUsersApp(service);

    const res = await request(app).get("/api/v1/users?role=Analyst");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("POST /invite creates invitation", async () => {
    vi.mocked(service.inviteUser).mockResolvedValue({ userId: "u-new" } as never);
    const app = createUsersApp(service);

    const res = await request(app).post("/api/v1/users/invite").send({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@test.com",
      role: "Analyst",
    });

    expect(res.status).toBe(201);
    expect(service.inviteUser).toHaveBeenCalled();
  });

  it("PATCH /:id updates user", async () => {
    vi.mocked(service.updateUser).mockResolvedValue({ userId: "u-1", firstName: "Updated" } as never);
    const app = createUsersApp(service);

    const res = await request(app).patch("/api/v1/users/u-1").send({ firstName: "Updated" });

    expect(res.status).toBe(200);
    expect(service.updateUser).toHaveBeenCalledWith("u-1", { firstName: "Updated" });
  });

  it("DELETE /:id deactivates user", async () => {
    vi.mocked(service.deactivate).mockResolvedValue(undefined as never);
    const app = createUsersApp(service);

    const res = await request(app).delete("/api/v1/users/u-1");

    expect(res.status).toBe(200);
    expect(service.deactivate).toHaveBeenCalledWith("u-1");
  });

  it("POST /:id/resend-invitation resends invite", async () => {
    vi.mocked(service.resendInvitation).mockResolvedValue(undefined as never);
    const app = createUsersApp(service);

    const res = await request(app).post("/api/v1/users/u-1/resend-invitation");

    expect(res.status).toBe(200);
    expect(service.resendInvitation).toHaveBeenCalledWith("u-1");
  });

  it("DELETE /:id/invitations cancels invitation", async () => {
    vi.mocked(service.cancelInvitation).mockResolvedValue(undefined as never);
    const app = createUsersApp(service);

    const res = await request(app).delete("/api/v1/users/u-1/invitations");

    expect(res.status).toBe(200);
    expect(service.cancelInvitation).toHaveBeenCalledWith("u-1");
  });

  it("GET /export returns csv", async () => {
    vi.mocked(service.exportAll).mockResolvedValue([
      {
        userId: "u-1",
        email: "ada@test.com",
        firstName: "Ada",
        lastName: "Lovelace",
        role: "Analyst",
        status: "Active",
      },
    ] as never);
    const app = createUsersApp(service);

    const res = await request(app).get("/api/v1/users/export");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text).toContain("ada@test.com");
  });

  it("POST /invite returns 422 for invalid body", async () => {
    const app = createUsersApp(service);
    const res = await request(app).post("/api/v1/users/invite").send({ email: "not-an-email" });
    expect(res.status).toBe(422);
  });
});
