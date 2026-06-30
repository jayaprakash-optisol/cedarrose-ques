import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { auditRouter } from "../../../src/modules/audit/audit.router.js";
import { AuditController } from "../../../src/modules/audit/audit.controller.js";
import type { AuditService } from "../../../src/modules/audit/audit.service.js";
import { errorHandler } from "../../../src/middleware/error-handler.js";
import { createMockUser } from "../../helpers/mock-user.js";

function createMockAuditService(): AuditService {
  return {
    list: vi.fn(),
    export: vi.fn(),
    log: vi.fn(),
  } as unknown as AuditService;
}

function createAuditApp(service: AuditService, role = "Admin") {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = createMockUser({ role });
    next();
  });
  app.use("/api/v1/audit", auditRouter(new AuditController(service)));
  app.use(errorHandler);
  return app;
}

describe("audit router", () => {
  let service: ReturnType<typeof createMockAuditService>;

  beforeEach(() => {
    service = createMockAuditService();
  });

  it("GET / lists audit events for Admin", async () => {
    vi.mocked(service.list).mockResolvedValue({ data: [{ auditId: "a-1" }], total: 1 } as never);
    const app = createAuditApp(service, "Admin");

    const res = await request(app).get("/api/v1/audit?caseId=case-1&type=CaseCreated");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(service.list).toHaveBeenCalled();
  });

  it("GET / denies non-Admin users", async () => {
    const app = createAuditApp(service, "Analyst");
    const res = await request(app).get("/api/v1/audit");
    expect(res.status).toBe(403);
  });

  it("GET /export returns csv for Admin", async () => {
    vi.mocked(service.export).mockResolvedValue([
      {
        createdAt: "2026-01-01",
        eventType: "CaseCreated",
        description: "Created",
        status: "Success",
        caseId: "case-1",
      },
    ] as never);
    const app = createAuditApp(service, "Admin");

    const res = await request(app).get("/api/v1/audit/export");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text).toContain("CaseCreated");
  });
});
