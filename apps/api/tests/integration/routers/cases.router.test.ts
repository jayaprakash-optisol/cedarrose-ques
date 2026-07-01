import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { casesRouter } from "../../../src/modules/cases/cases.router.js";
import { CasesController } from "../../../src/modules/cases/cases.controller.js";
import type { CasesService } from "../../../src/modules/cases/cases.service.js";
import { errorHandler } from "../../../src/middleware/error-handler.js";
import { createMockUser } from "../../helpers/mock-user.js";

function createMockCasesService(): CasesService {
  return {
    list: vi.fn(),
    getById: vi.fn(),
    createCase: vi.fn(),
    resendLink: vi.fn(),
    apiPush: vi.fn(),
    exportBatches: vi.fn(),
  } as unknown as CasesService;
}

function createCasesApp(service: CasesService, role = "Analyst") {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = createMockUser({ role });
    next();
  });
  app.use("/api/v1/cases", casesRouter(new CasesController(service)));
  app.use(errorHandler);
  return app;
}

describe("cases router", () => {
  let service: ReturnType<typeof createMockCasesService>;

  beforeEach(() => {
    service = createMockCasesService();
  });

  it("GET / returns paginated cases", async () => {
    vi.mocked(service.list).mockResolvedValue({ data: [{ caseId: "case-1" }], total: 1 } as never);
    const app = createCasesApp(service);

    const res = await request(app).get("/api/v1/cases");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toEqual(expect.objectContaining({ total: 1 }));
  });

  it("GET /:id returns case by id", async () => {
    vi.mocked(service.getById).mockResolvedValue({ caseId: "case-1", subjectName: "Test" } as never);
    const app = createCasesApp(service);

    const res = await request(app).get("/api/v1/cases/case-1");

    expect(res.status).toBe(200);
    expect(service.getById).toHaveBeenCalledWith("case-1");
  });

  it("POST / creates a case", async () => {
    vi.mocked(service.createCase).mockResolvedValue({ caseId: "new-case" } as never);
    const app = createCasesApp(service);

    const res = await request(app).post("/api/v1/cases").send({
      orderId: "ORD-100",
      subjectName: "New Subject",
      country: "UK",
      recipientType: "Supplier",
    });

    expect(res.status).toBe(201);
    expect(service.createCase).toHaveBeenCalled();
  });

  it("POST / returns 422 for invalid payload", async () => {
    const app = createCasesApp(service);
    const res = await request(app).post("/api/v1/cases").send({ orderId: "" });
    expect(res.status).toBe(422);
  });

  it("GET /export requires Admin or Analyst role", async () => {
    async function* batches() {
      yield [];
    }
    vi.mocked(service.exportBatches).mockReturnValue(batches());
    const analystApp = createCasesApp(service, "Analyst");
    const researcherApp = createCasesApp(service, "Researcher");

    const allowed = await request(analystApp).get("/api/v1/cases/export");
    const denied = await request(researcherApp).get("/api/v1/cases/export");

    expect(allowed.status).toBe(200);
    expect(allowed.headers["content-type"]).toContain("text/csv");
    expect(denied.status).toBe(403);
  });
});
