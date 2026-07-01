import type { Request, Response } from "express";
import type { CasesService } from "./cases.service.js";
import { parsePagination, paginationMeta, sanitizeCsvCell } from "../../shared/utils/pagination.js";
import { parseDateQuery, parseOptionalString } from "../../shared/utils/list-query.js";
import { sendSuccess } from "../../shared/utils/response.js";
import { routeParam } from "../../shared/utils/route-param.js";
import type { CaseWithAnalyst } from "./cases.repository.js";

function parseCaseListQuery(query: Record<string, unknown>) {
  const { page, limit, offset } = parsePagination(query);
  return {
    page,
    limit,
    offset,
    filters: {
      status: parseOptionalString(query.status),
      recipientType: parseOptionalString(query.recipientType),
      country: parseOptionalString(query.country),
      analystId: parseOptionalString(query.analystId),
      search: parseOptionalString(query.search),
      from: parseDateQuery(query.from),
      to: parseDateQuery(query.to, true),
      offset,
      limit,
    },
  };
}

function parseCaseExportQuery(query: Record<string, unknown>) {
  return {
    status: parseOptionalString(query.status),
    recipientType: parseOptionalString(query.recipientType),
    country: parseOptionalString(query.country),
    analystId: parseOptionalString(query.analystId),
    search: parseOptionalString(query.search),
    from: parseDateQuery(query.from),
    to: parseDateQuery(query.to, true),
  };
}

function caseCsvRow(row: CaseWithAnalyst): string {
  return [
    row.orderId,
    row.subjectName,
    row.country,
    row.recipientType,
    row.status,
    `${row.completionMandatory}%`,
    row.dateReceived.toISOString(),
    row.lastActivity?.toISOString() ?? "",
    row.researcherStatus ?? "",
  ]
    .map((c) => sanitizeCsvCell(String(c ?? "")))
    .join(",");
}

export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  list = async (req: Request, res: Response) => {
    const { page, limit, filters } = parseCaseListQuery(req.query);
    const { data, total } = await this.casesService.list(filters);
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

  exportCsv = async (req: Request, res: Response) => {
    const filters = parseCaseExportQuery(req.query);
    const header =
      "Order ID,Company name,Country,Recipient,Status,Mandatory,Requested,Last Activity,Researcher\n";
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=cases.csv");
    res.write(header);

    for await (const batch of this.casesService.exportBatches(filters)) {
      for (const row of batch) {
        res.write(`${caseCsvRow(row)}\n`);
      }
    }

    res.end();
  };
}
