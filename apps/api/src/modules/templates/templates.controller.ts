import type { Request, Response } from "express";
import type { TemplatesService } from "./templates.service.js";
import { sendSuccess } from "../../shared/utils/response.js";
import { routeParam } from "../../shared/utils/route-param.js";

export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  list = async (_req: Request, res: Response) => {
    const data = await this.templatesService.list();
    sendSuccess(res, data);
  };

  getById = async (req: Request, res: Response) => {
    const data = await this.templatesService.getById(routeParam(req.params.id));
    sendSuccess(res, data);
  };

  create = async (req: Request, res: Response) => {
    const data = await this.templatesService.create({
      ...req.body,
      createdBy: req.user!.userId,
    });
    sendSuccess(res, data, 201, "Template created");
  };

  replace = async (req: Request, res: Response) => {
    const data = await this.templatesService.replace(routeParam(req.params.id), {
      ...req.body,
      updatedBy: req.user!.userId,
    });
    sendSuccess(res, data, 200, "Template updated");
  };

  updateStatus = async (req: Request, res: Response) => {
    const { status } = req.body as { status: "Active" | "Draft" };
    const data = await this.templatesService.updateStatus(routeParam(req.params.id), status, req.user!.userId);
    sendSuccess(res, data, 200, "Template status updated");
  };

  delete = async (req: Request, res: Response) => {
    await this.templatesService.delete(routeParam(req.params.id));
    sendSuccess(res, null, 200, "Template deleted");
  };
}
