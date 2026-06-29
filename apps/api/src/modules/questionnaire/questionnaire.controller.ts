import type { Request, Response } from "express";
import type { QuestionnaireService } from "./questionnaire.service.js";
import { sendSuccess } from "../../shared/utils/response.js";

export class QuestionnaireController {
  constructor(private readonly questionnaireService: QuestionnaireService) {}

  verifyLink = async (req: Request, res: Response) => {
    const data = await this.questionnaireService.verifyLink(req.body.token);
    sendSuccess(res, data);
  };

  authenticate = async (req: Request, res: Response) => {
    await this.questionnaireService.requestOtp(req.body.token, req.body.email);
    sendSuccess(res, null, 200, "OTP sent");
  };

  otpVerify = async (req: Request, res: Response) => {
    const data = await this.questionnaireService.verifyOtp(req.body.token, req.body.otp);
    sendSuccess(res, data);
  };

  getForm = async (req: Request, res: Response) => {
    const data = await this.questionnaireService.getForm(req.headers.authorization);
    sendSuccess(res, data);
  };

  save = async (req: Request, res: Response) => {
    await this.questionnaireService.saveProgress(req.headers.authorization, req.body.responses);
    sendSuccess(res, null, 200, "Progress saved");
  };

  submit = async (req: Request, res: Response) => {
    const data = await this.questionnaireService.submit(req.headers.authorization);
    sendSuccess(res, data, 200, "Questionnaire submitted");
  };
}
