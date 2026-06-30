import type { Request, Response } from "express";
import type { CasesService } from "./cases.service.js";
import { parsePagination, paginationMeta, sanitizeCsvCell } from "../../shared/utils/pagination.js";
import { sendSuccess } from "../../shared/utils/response.js";
import { routeParam } from "../../shared/utils/route-param.js";

export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  list = async (req: Request, res: Response) => {
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const { data, total } = await this.casesService.list({
      status: req.query.status as string | undefined,
      recipientType: req.query.recipientType as string | undefined,
      country: req.query.country as string | undefined,
      analystId: req.query.analystId as string | undefined,
      search: req.query.search as string | undefined,
      offset,
      limit,
    });
    sendSuccess(res, data, 200, undefined, paginationMeta(page, limit, total));
  };

  getById = async (req: Request, res: Response) => {
    const data = await this.casesService.getById(routeParam(req.params.id));
    sendSuccess(res, data);
  };

  create = async (req: Request, res: Response) => {
    const data = await this.casesService.createCase(req.body, req.user!.userId);
    sendSuccess(res, data, 201, "Case created");
  };

  resendLink = async (req: Request, res: Response) => {
    const data = await this.casesService.resendLink(
      routeParam(req.params.id),
      req.user!.userId,
      req.user!.role
    );
    sendSuccess(res, data, 200, "Link resent");
  };

  apiPush = async (req: Request, res: Response) => {
    const data = await this.casesService.apiPush(routeParam(req.params.id));
    sendSuccess(res, data, 200, "API push triggered");
  };

  exportCsv = async (_req: Request, res: Response) => {
    const rows = await this.casesService.exportAll();
    const header = "caseRef,orderId,subjectName,status,country\n";
    const body = rows
      .map((r) =>
        [r.caseRef, r.orderId, r.subjectName, r.status, r.country]
          .map((c) => sanitizeCsvCell(String(c ?? "")))
          .join(",")
      )
      .join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=cases.csv");
    res.send(header + body);
  };
}
