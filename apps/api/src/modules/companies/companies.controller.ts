import type { Request, Response } from "express";
import type { CompaniesService } from "./companies.service.js";
import { parsePagination, paginationMeta } from "../../shared/utils/pagination.js";
import { sendSuccess } from "../../shared/utils/response.js";
import { routeParam } from "../../shared/utils/route-param.js";

export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  getByUid = async (req: Request, res: Response) => {
    const company = await this.companiesService.getByUid(routeParam(req.params.uid));
    sendSuccess(res, company);
  };

  list = async (req: Request, res: Response) => {
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const { data, total } = await this.companiesService.list(offset, limit);
    sendSuccess(res, data, 200, undefined, paginationMeta(page, limit, total));
  };

  create = async (req: Request, res: Response) => {
    const company = await this.companiesService.create(req.body);
    sendSuccess(res, company, 201, "Company created");
  };

  update = async (req: Request, res: Response) => {
    const company = await this.companiesService.update(routeParam(req.params.uid), req.body);
    sendSuccess(res, company, 200, "Company updated");
  };
}
