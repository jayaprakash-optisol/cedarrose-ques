import type { Request, Response } from "express";
import type { ConfigService } from "./config.service.js";
import { sendSuccess } from "../../shared/utils/response.js";

export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  get = async (_req: Request, res: Response) => {
    const data = await this.configService.get();
    sendSuccess(res, data);
  };

  replace = async (req: Request, res: Response) => {
    const data = await this.configService.replace(req.body, req.user!.userId);
    sendSuccess(res, data, 200, "Config updated");
  };
}
