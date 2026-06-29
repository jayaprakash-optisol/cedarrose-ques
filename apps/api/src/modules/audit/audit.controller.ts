import type { Request, Response } from "express";
import type { AuditService } from "./audit.service.js";
import { parsePagination, paginationMeta, sanitizeCsvCell } from "../../shared/utils/pagination.js";
import { sendSuccess } from "../../shared/utils/response.js";

export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  list = async (req: Request, res: Response) => {
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const { data, total } = await this.auditService.list({
      caseId: req.query.caseId as string | undefined,
      type: req.query.type as string | undefined,
      status: req.query.status as string | undefined,
      from: req.query.from ? new Date(req.query.from as string) : undefined,
      to: req.query.to ? new Date(req.query.to as string) : undefined,
      offset,
      limit,
    });
    sendSuccess(res, data, 200, undefined, paginationMeta(page, limit, total));
  };

  exportCsv = async (req: Request, res: Response) => {
    const rows = await this.auditService.export({
      caseId: req.query.caseId as string | undefined,
      type: req.query.type as string | undefined,
      status: req.query.status as string | undefined,
      from: req.query.from ? new Date(req.query.from as string) : undefined,
      to: req.query.to ? new Date(req.query.to as string) : undefined,
    });

    const header = "createdAt,eventType,description,status,caseId\n";
    const body = rows
      .map((r) =>
        [r.createdAt, r.eventType, r.description, r.status, r.caseId]
          .map((c) => sanitizeCsvCell(String(c ?? "")))
          .join(",")
      )
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=audit-log.csv");
    res.send(header + body);
  };
}
