import type { Request, Response } from "express";
import type { AuditService } from "./audit.service.js";
import { parsePagination, paginationMeta, sanitizeCsvCell } from "../../shared/utils/pagination.js";
import { parseDateQuery, parseOptionalString } from "../../shared/utils/list-query.js";
import { sendSuccess } from "../../shared/utils/response.js";
import { normalizeWorkflowStep } from "../../config/workflow.js";

function parseAuditListQuery(query: Record<string, unknown>) {
  const { page, limit, offset } = parsePagination(query);
  return {
    page,
    limit,
    offset,
    filters: {
      caseId: parseOptionalString(query.caseId),
      type: parseOptionalString(query.type),
      status: parseOptionalString(query.status),
      search: parseOptionalString(query.search),
      from: parseDateQuery(query.from),
      to: parseDateQuery(query.to, true),
      offset,
      limit,
      grouped: query.grouped === "false" ? false : true,
    },
  };
}

function parseAuditExportQuery(query: Record<string, unknown>) {
  return {
    caseId: parseOptionalString(query.caseId),
    type: parseOptionalString(query.type),
    status: parseOptionalString(query.status),
    search: parseOptionalString(query.search),
    from: parseDateQuery(query.from),
    to: parseDateQuery(query.to, true),
  };
}

export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  list = async (req: Request, res: Response) => {
    const { page, limit, filters } = parseAuditListQuery(req.query as Record<string, unknown>);
    const { data, total } = await this.auditService.list(filters);
    sendSuccess(res, data, 200, undefined, paginationMeta(page, limit, total));
  };

  exportCsv = async (req: Request, res: Response) => {
    const filters = parseAuditExportQuery(req.query as Record<string, unknown>);
    const header =
      "Timestamp,Case,Order,Step,Type,Description,TriggeredBy,Case status\n";
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=audit-log.csv");
    res.write(header);

    for await (const batch of this.auditService.exportBatches(filters)) {
      for (const row of batch) {
        const step = row.step != null ? (normalizeWorkflowStep(row.step, row.eventType) ?? row.step) : "";
        const line = [
          row.createdAt.toISOString(),
          row.caseSubject ?? "",
          row.caseOrderId ?? "",
          step,
          row.eventType,
          row.description,
          row.triggeredBy ?? "System",
          row.caseStatus ?? "",
        ]
          .map((c) => sanitizeCsvCell(String(c ?? "")))
          .join(",");
        res.write(`${line}\n`);
      }
    }

    res.end();
  };
}
