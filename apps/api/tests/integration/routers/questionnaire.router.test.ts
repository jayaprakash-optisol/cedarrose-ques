import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { questionnaireRouter } from "../../../src/modules/questionnaire/questionnaire.router.js";
import { QuestionnaireController } from "../../../src/modules/questionnaire/questionnaire.controller.js";
import type { QuestionnaireService } from "../../../src/modules/questionnaire/questionnaire.service.js";
import { errorHandler } from "../../../src/middleware/error-handler.js";

function createMockQuestionnaireService(): QuestionnaireService {
  return {
    verifyLink: vi.fn(),
    requestOtp: vi.fn(),
    verifyOtp: vi.fn(),
    getForm: vi.fn(),
    saveProgress: vi.fn(),
    submit: vi.fn(),
  } as unknown as QuestionnaireService;
}

function createQuestionnaireApp(service: QuestionnaireService) {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/questionnaire", questionnaireRouter(new QuestionnaireController(service)));
  app.use(errorHandler);
  return app;
}

describe("questionnaire router", () => {
  let service: ReturnType<typeof createMockQuestionnaireService>;

  beforeEach(() => {
    service = createMockQuestionnaireService();
  });

  it("POST /verify-link validates token and returns data", async () => {
    vi.mocked(service.verifyLink).mockResolvedValue({ caseId: "case-1", valid: true } as never);
    const app = createQuestionnaireApp(service);

    const res = await request(app).post("/api/v1/questionnaire/verify-link").send({ token: "link-token" });

    expect(res.status).toBe(200);
    expect(service.verifyLink).toHaveBeenCalledWith("link-token");
  });

  it("POST /authenticate requests OTP", async () => {
    const app = createQuestionnaireApp(service);
    const res = await request(app)
      .post("/api/v1/questionnaire/authenticate")
      .send({ token: "link-token" });

    expect(res.status).toBe(200);
    expect(service.requestOtp).toHaveBeenCalledWith("link-token");
  });

  it("POST /otp-verify validates OTP", async () => {
    vi.mocked(service.verifyOtp).mockResolvedValue({ sessionToken: "session" } as never);
    const app = createQuestionnaireApp(service);

    const res = await request(app)
      .post("/api/v1/questionnaire/otp-verify")
      .send({ token: "link-token", otp: "123456" });

    expect(res.status).toBe(200);
    expect(service.verifyOtp).toHaveBeenCalledWith("link-token", "123456");
  });

  it("GET /:token/form returns questionnaire form", async () => {
    vi.mocked(service.getForm).mockResolvedValue({ sections: [] } as never);
    const app = createQuestionnaireApp(service);

    const res = await request(app)
      .get("/api/v1/questionnaire/session-token/form")
      .set("Authorization", "Bearer session-token");

    expect(res.status).toBe(200);
    expect(service.getForm).toHaveBeenCalledWith("Bearer session-token");
  });

  it("POST /:token/save persists progress", async () => {
    const app = createQuestionnaireApp(service);
    const responses = [{ question: "Q1", answer: "A1" }];

    const res = await request(app)
      .post("/api/v1/questionnaire/session-token/save")
      .set("Authorization", "Bearer session-token")
      .send({ responses });

    expect(res.status).toBe(200);
    expect(service.saveProgress).toHaveBeenCalledWith("Bearer session-token", responses);
  });

  it("POST /:token/submit completes questionnaire", async () => {
    vi.mocked(service.submit).mockResolvedValue({ submitted: true } as never);
    const app = createQuestionnaireApp(service);

    const res = await request(app)
      .post("/api/v1/questionnaire/session-token/submit")
      .set("Authorization", "Bearer session-token");

    expect(res.status).toBe(200);
    expect(service.submit).toHaveBeenCalledWith("Bearer session-token");
  });

  it("POST /verify-link returns 422 without token", async () => {
    const app = createQuestionnaireApp(service);
    const res = await request(app).post("/api/v1/questionnaire/verify-link").send({});
    expect(res.status).toBe(422);
  });
});
