import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { companyRequestsRouter } from "../../../src/modules/company-requests/company-requests.router.js";
import { companyRequestsWebhookRouter } from "../../../src/modules/company-requests/company-requests.webhook.router.js";
import { CompanyRequestsController } from "../../../src/modules/company-requests/company-requests.controller.js";
import type { CompanyRequestsService } from "../../../src/modules/company-requests/company-requests.service.js";
import { AppError } from "../../../src/shared/errors/AppError.js";
import { errorHandler } from "../../../src/middleware/error-handler.js";
import { createMockUser } from "../../helpers/mock-user.js";

const REQUEST_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

const row = {
  companyRequestId: REQUEST_ID,
  orderId: "ORD-10001",
  externalRef: "UID-44529",
  companyName: "Acme Trading LLC",
  country: "UAE",
  recipientEmails: ["contact@acme.example"],
  status: "Pending",
};

const webhookPayload = {
  orderId: "ORD-10001",
  externalRef: "UID-44529",
  companyName: "Acme Trading LLC",
  country: "UAE",
  recipientEmails: ["contact@acme.example"],
};

function createMockService(): CompanyRequestsService {
  return {
    receive: vi.fn(),
    list: vi.fn(),
    getById: vi.fn(),
  } as unknown as CompanyRequestsService;
}

function createApp(service: CompanyRequestsService, role = "Analyst") {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = createMockUser({ role });
    next();
  });
  const controller = new CompanyRequestsController(service);
  app.use("/api/v1/company-requests", companyRequestsRouter(controller));
  app.use("/api/v1/webhooks/company-requests", companyRequestsWebhookRouter(controller));
  app.use(errorHandler);
  return app;
}

describe("company-requests router", () => {
  let service: CompanyRequestsService;

  beforeEach(() => {
    service = createMockService();
  });

  it("GET / lists company requests filtered by status", async () => {
    vi.mocked(service.list).mockResolvedValue([row] as never);
    const app = createApp(service);

    const res = await request(app).get("/api/v1/company-requests?status=Pending");

    expect(res.status).toBe(200);
    expect(service.list).toHaveBeenCalledWith("Pending");
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].orderId).toBe("ORD-10001");
  });

  it("GET / lists all company requests when no status is given", async () => {
    vi.mocked(service.list).mockResolvedValue([] as never);
    const app = createApp(service);

    const res = await request(app).get("/api/v1/company-requests");

    expect(res.status).toBe(200);
    expect(service.list).toHaveBeenCalledWith(undefined);
  });

  it("GET /:id returns a single company request", async () => {
    vi.mocked(service.getById).mockResolvedValue(row as never);
    const app = createApp(service);

    const res = await request(app).get(`/api/v1/company-requests/${REQUEST_ID}`);

    expect(res.status).toBe(200);
    expect(service.getById).toHaveBeenCalledWith(REQUEST_ID);
    expect(res.body.data.companyRequestId).toBe(REQUEST_ID);
  });

  it("GET /:id returns 404 when the request does not exist", async () => {
    vi.mocked(service.getById).mockRejectedValue(
      new AppError(404, "NOT_FOUND", `Company request ${REQUEST_ID} not found`),
    );
    const app = createApp(service);

    const res = await request(app).get(`/api/v1/company-requests/${REQUEST_ID}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe("company-requests webhook router", () => {
  let service: CompanyRequestsService;

  beforeEach(() => {
    service = createMockService();
  });

  it("POST / stores a valid payload and responds 201", async () => {
    vi.mocked(service.receive).mockResolvedValue(row as never);
    const app = createApp(service, "Integration");

    const res = await request(app)
      .post("/api/v1/webhooks/company-requests")
      .send(webhookPayload);

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Company request received");
    expect(service.receive).toHaveBeenCalledWith(expect.objectContaining(webhookPayload));
  });

  it("POST / rejects a payload with no recipient emails", async () => {
    const app = createApp(service, "Integration");

    const res = await request(app)
      .post("/api/v1/webhooks/company-requests")
      .send({ ...webhookPayload, recipientEmails: [] });

    expect(res.status).toBe(422);
    expect(service.receive).not.toHaveBeenCalled();
  });

  it("POST / rejects a payload missing required fields", async () => {
    const app = createApp(service, "Integration");

    const res = await request(app)
      .post("/api/v1/webhooks/company-requests")
      .send({ orderId: "ORD-10001" });

    expect(res.status).toBe(422);
    expect(service.receive).not.toHaveBeenCalled();
  });
});
