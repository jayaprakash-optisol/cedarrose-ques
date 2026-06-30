import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { companiesRouter } from "../../../src/modules/companies/companies.router.js";
import { CompaniesController } from "../../../src/modules/companies/companies.controller.js";
import type { CompaniesService } from "../../../src/modules/companies/companies.service.js";
import { errorHandler } from "../../../src/middleware/error-handler.js";
import { createMockUser } from "../../helpers/mock-user.js";

function createMockCompaniesService(): CompaniesService {
  return {
    getByUid: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  } as unknown as CompaniesService;
}

function createCompaniesApp(service: CompaniesService, role = "Admin") {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = createMockUser({ role });
    next();
  });
  app.use("/api/v1/companies", companiesRouter(new CompaniesController(service)));
  app.use(errorHandler);
  return app;
}

describe("companies router", () => {
  let service: ReturnType<typeof createMockCompaniesService>;

  beforeEach(() => {
    service = createMockCompaniesService();
  });

  it("GET /:uid returns company by uid", async () => {
    vi.mocked(service.getByUid).mockResolvedValue({
      companyId: "uid-1",
      companyName: "Acme",
    } as never);
    const app = createCompaniesApp(service, "Analyst");

    const res = await request(app).get("/api/v1/companies/uid-1");

    expect(res.status).toBe(200);
    expect(service.getByUid).toHaveBeenCalledWith("uid-1");
  });

  it("GET / lists companies for Admin", async () => {
    vi.mocked(service.list).mockResolvedValue({ data: [{ companyId: "c-1" } as never], total: 1 });
    const app = createCompaniesApp(service, "Admin");

    const res = await request(app).get("/api/v1/companies");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("GET / denies non-Admin users", async () => {
    const app = createCompaniesApp(service, "Analyst");
    const res = await request(app).get("/api/v1/companies");
    expect(res.status).toBe(403);
  });

  it("POST / creates company for Admin", async () => {
    vi.mocked(service.create).mockResolvedValue({ companyId: "new-co" } as never);
    const app = createCompaniesApp(service, "Admin");

    const res = await request(app).post("/api/v1/companies").send({
      companyName: "New Co",
      crisNumber: "CRIS-NEW",
    });

    expect(res.status).toBe(201);
    expect(service.create).toHaveBeenCalled();
  });

  it("PATCH /:uid updates company for Admin", async () => {
    vi.mocked(service.update).mockResolvedValue({ companyId: "uid-1", companyName: "Updated" } as never);
    const app = createCompaniesApp(service, "Admin");

    const res = await request(app).patch("/api/v1/companies/uid-1").send({ companyName: "Updated" });

    expect(res.status).toBe(200);
    expect(service.update).toHaveBeenCalledWith("uid-1", { companyName: "Updated" });
  });

  it("POST / returns 422 for invalid body", async () => {
    const app = createCompaniesApp(service, "Admin");
    const res = await request(app).post("/api/v1/companies").send({ companyName: "" });
    expect(res.status).toBe(422);
  });
});
