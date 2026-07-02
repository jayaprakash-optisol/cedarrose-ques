import type { Request, Response } from "express";
import type { CompanyRequestsService } from "./company-requests.service.js";
import { sendSuccess } from "../../shared/utils/response.js";
import { routeParam } from "../../shared/utils/route-param.js";

export class CompanyRequestsController {
  constructor(private readonly service: CompanyRequestsService) {}

  receive = async (req: Request, res: Response) => {
    const data = await this.service.receive(req.body);
    sendSuccess(res, data, 201, "Company request received");
  };

  list = async (req: Request, res: Response) => {
    const status = req.query.status as string | undefined;
    const data = await this.service.list(status);
    sendSuccess(res, data);
  };

  getById = async (req: Request, res: Response) => {
    const data = await this.service.getById(routeParam(req.params.id));
    sendSuccess(res, data);
  };
}
