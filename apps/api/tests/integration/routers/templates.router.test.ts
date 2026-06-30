import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { templatesRouter } from "../../../src/modules/templates/templates.router.js";
import { TemplatesController } from "../../../src/modules/templates/templates.controller.js";
import type { TemplatesService } from "../../../src/modules/templates/templates.service.js";
import { errorHandler } from "../../../src/middleware/error-handler.js";
import { createMockUser } from "../../helpers/mock-user.js";

function createMockTemplatesService(): TemplatesService {
  return {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    replace: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
  } as unknown as TemplatesService;
}

function createTemplatesApp(service: TemplatesService) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = createMockUser({ role: "Admin" });
    next();
  });
  app.use("/api/v1/templates", templatesRouter(new TemplatesController(service)));
  app.use(errorHandler);
  return app;
}

const validSection = {
  title: "General",
  orderIndex: 0,
  questions: [{ label: "Company name", fieldType: "text" }],
};

describe("templates router", () => {
  let service: ReturnType<typeof createMockTemplatesService>;

  beforeEach(() => {
    service = createMockTemplatesService();
  });

  it("GET / lists templates", async () => {
    vi.mocked(service.list).mockResolvedValue([{ templateId: "t-1" }] as never);
    const app = createTemplatesApp(service);

    const res = await request(app).get("/api/v1/templates");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("GET /:id returns template", async () => {
    vi.mocked(service.getById).mockResolvedValue({ templateId: "t-1" } as never);
    const app = createTemplatesApp(service);

    const res = await request(app).get("/api/v1/templates/t-1");

    expect(res.status).toBe(200);
    expect(service.getById).toHaveBeenCalledWith("t-1");
  });

  it("POST / creates template", async () => {
    vi.mocked(service.create).mockResolvedValue({ templateId: "new-t" } as never);
    const app = createTemplatesApp(service);

    const res = await request(app).post("/api/v1/templates").send({
      name: "New Template",
      sections: [validSection],
    });

    expect(res.status).toBe(201);
    expect(service.create).toHaveBeenCalled();
  });

  it("PUT /:id replaces template", async () => {
    vi.mocked(service.replace).mockResolvedValue({ templateId: "t-1" } as never);
    const app = createTemplatesApp(service);

    const res = await request(app).put("/api/v1/templates/t-1").send({
      name: "Updated",
      sections: [validSection],
    });

    expect(res.status).toBe(200);
    expect(service.replace).toHaveBeenCalled();
  });

  it("PATCH /:id/status updates status", async () => {
    vi.mocked(service.updateStatus).mockResolvedValue({ templateId: "t-1", status: "Active" } as never);
    const app = createTemplatesApp(service);

    const res = await request(app).patch("/api/v1/templates/t-1/status").send({ status: "Active" });

    expect(res.status).toBe(200);
    expect(service.updateStatus).toHaveBeenCalledWith("t-1", "Active", expect.any(String));
  });

  it("DELETE /:id deletes template", async () => {
    vi.mocked(service.delete).mockResolvedValue(undefined);
    const app = createTemplatesApp(service);

    const res = await request(app).delete("/api/v1/templates/t-1");

    expect(res.status).toBe(200);
    expect(service.delete).toHaveBeenCalledWith("t-1");
  });

  it("POST / returns 422 for invalid body", async () => {
    const app = createTemplatesApp(service);
    const res = await request(app).post("/api/v1/templates").send({ name: "" });
    expect(res.status).toBe(422);
  });
});
