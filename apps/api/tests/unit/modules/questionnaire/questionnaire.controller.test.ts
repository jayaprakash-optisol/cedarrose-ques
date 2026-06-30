import { describe, it, expect, beforeEach, vi } from "vitest";
import { QuestionnaireController } from "../../../../src/modules/questionnaire/questionnaire.controller.js";
import type { QuestionnaireService } from "../../../../src/modules/questionnaire/questionnaire.service.js";
import { createMockRequest, createMockResponse } from "../../../helpers/mock-express.js";

describe("QuestionnaireController", () => {
  let questionnaireService: QuestionnaireService;
  let controller: QuestionnaireController;
  let res: ReturnType<typeof createMockResponse>;

  const mockForm = { caseId: "case-1", questions: [] };
  const mockVerify = { caseId: "case-1", subjectName: "Acme" };
  const mockOtpResult = { sessionToken: "session-tok" };
  const mockSubmit = { submittedAt: "2026-01-01T00:00:00.000Z" };

  beforeEach(() => {
    questionnaireService = {
      verifyLink: vi.fn(),
      requestOtp: vi.fn(),
      verifyOtp: vi.fn(),
      getForm: vi.fn(),
      saveProgress: vi.fn(),
      submit: vi.fn(),
    } as unknown as QuestionnaireService;

    controller = new QuestionnaireController(questionnaireService);
    res = createMockResponse();
  });

  describe("verifyLink", () => {
    it("verifies link token and returns data", async () => {
      vi.mocked(questionnaireService.verifyLink).mockResolvedValue(mockVerify);
      const req = createMockRequest({ body: { token: "link-tok" } });

      await controller.verifyLink(req, res);

      expect(questionnaireService.verifyLink).toHaveBeenCalledWith("link-tok");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockVerify }));
    });
  });

  describe("authenticate", () => {
    it("requests OTP and returns success", async () => {
      const req = createMockRequest({ body: { token: "link-tok" } });

      await controller.authenticate(req, res);

      expect(questionnaireService.requestOtp).toHaveBeenCalledWith("link-tok");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "OTP sent" }));
    });
  });

  describe("otpVerify", () => {
    it("verifies OTP and returns session data", async () => {
      vi.mocked(questionnaireService.verifyOtp).mockResolvedValue(mockOtpResult);
      const req = createMockRequest({ body: { token: "link-tok", otp: "123456" } });

      await controller.otpVerify(req, res);

      expect(questionnaireService.verifyOtp).toHaveBeenCalledWith("link-tok", "123456");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockOtpResult }));
    });
  });

  describe("getForm", () => {
    it("returns questionnaire form", async () => {
      vi.mocked(questionnaireService.getForm).mockResolvedValue(mockForm);
      const req = createMockRequest({ headers: { authorization: "Bearer session-tok" } });

      await controller.getForm(req, res);

      expect(questionnaireService.getForm).toHaveBeenCalledWith("Bearer session-tok");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockForm }));
    });
  });

  describe("save", () => {
    it("saves questionnaire progress", async () => {
      const responses = { q1: "answer" };
      const req = createMockRequest({
        headers: { authorization: "Bearer session-tok" },
        body: { responses },
      });

      await controller.save(req, res);

      expect(questionnaireService.saveProgress).toHaveBeenCalledWith("Bearer session-tok", responses);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Progress saved" }));
    });
  });

  describe("submit", () => {
    it("submits questionnaire", async () => {
      vi.mocked(questionnaireService.submit).mockResolvedValue(mockSubmit);
      const req = createMockRequest({ headers: { authorization: "Bearer session-tok" } });

      await controller.submit(req, res);

      expect(questionnaireService.submit).toHaveBeenCalledWith("Bearer session-tok");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: mockSubmit, message: "Questionnaire submitted" })
      );
    });
  });
});
