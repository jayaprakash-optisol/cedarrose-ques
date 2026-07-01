import type { AuditRepository, AuditRowWithCaseStatus } from "./audit.repository.js";
import type { CasesRepository } from "../cases/cases.repository.js";
import type { UsersRepository } from "../users/users.repository.js";
import type { auditEvents } from "../../db/schema/audit-events.js";
import { WORKFLOW_STEP_COUNT } from "../../config/workflow.js";

type AuditInsert = typeof auditEvents.$inferInsert;
type AuditRow = typeof auditEvents.$inferSelect;

export type AuditListFilters = Parameters<AuditRepository["findAll"]>[0] & {
  grouped?: boolean;
};

export class AuditService {
  constructor(
    private readonly auditRepo: AuditRepository,
    private readonly casesRepo: CasesRepository,
    private readonly usersRepo: UsersRepository,
  ) {}

  private async enrichEvent(event: AuditInsert | AuditRow): Promise<AuditInsert> {
    const enriched: AuditInsert = { ...event };

    if (enriched.caseId && (!enriched.caseSubject || !enriched.caseOrderId)) {
      const c = await this.casesRepo.findById(enriched.caseId);
      if (c) {
        enriched.caseSubject ??= c.subjectName;
        enriched.caseOrderId ??= c.orderId;
      }
    }

    if (enriched.triggeredByUserId && !enriched.triggeredBy) {
      const user = await this.usersRepo.findById(enriched.triggeredByUserId);
      if (user) {
        enriched.triggeredBy = `${user.firstName} ${user.lastName}`.trim();
      }
    }

    if (!enriched.triggeredBy) {
      enriched.triggeredBy = "System";
    }

    return enriched;
  }

  private async enrichEvents(events: AuditRow[]): Promise<AuditRow[]> {
    const caseIds = [...new Set(events.map((e) => e.caseId).filter((id): id is string => !!id))];
    const userIds = [
      ...new Set(events.map((e) => e.triggeredByUserId).filter((id): id is string => !!id)),
    ];

    const caseMap = new Map<string, Awaited<ReturnType<CasesRepository["findById"]>>>();
    const userMap = new Map<string, Awaited<ReturnType<UsersRepository["findById"]>>>();

    await Promise.all([
      ...caseIds.map(async (id) => {
        const c = await this.casesRepo.findById(id);
        if (c) caseMap.set(id, c);
      }),
      ...userIds.map(async (id) => {
        const u = await this.usersRepo.findById(id);
        if (u) userMap.set(id, u);
      }),
    ]);

    return events.map((event) => {
      const c = event.caseId ? caseMap.get(event.caseId) : undefined;
      const u = event.triggeredByUserId ? userMap.get(event.triggeredByUserId) : undefined;
      return {
        ...event,
        caseSubject: event.caseSubject ?? c?.subjectName ?? null,
        caseOrderId: event.caseOrderId ?? c?.orderId ?? null,
        triggeredBy:
          event.triggeredBy ??
          (u ? `${u.firstName} ${u.lastName}`.trim() : undefined) ??
          "System",
      };
    });
  }

  private attachCaseStatus(
    events: AuditRow[],
    rows: AuditRowWithCaseStatus[]
  ): (AuditRow & { caseStatus?: string | null })[] {
    const statusByAuditId = new Map(rows.map((row) => [row.auditId, row.caseStatus]));
    return events.map((event) => ({
      ...event,
      caseStatus: statusByAuditId.get(event.auditId) ?? null,
    }));
  }

  async log(event: AuditInsert) {
    const enriched = await this.enrichEvent(event);
    const row = await this.auditRepo.insert(enriched);

    if (
      enriched.caseId &&
      enriched.step &&
      enriched.status === "Success" &&
      enriched.step <= WORKFLOW_STEP_COUNT
    ) {
      const c = await this.casesRepo.findById(enriched.caseId);
      const nextStep = Math.min(enriched.step + 1, WORKFLOW_STEP_COUNT + 1);
      if (c && (c.currentStep ?? 1) < nextStep) {
        await this.casesRepo.update(enriched.caseId, { currentStep: nextStep });
      }
    }

    return row;
  }

  async list(filters: AuditListFilters) {
    const { grouped = true, ...repoFilters } = filters;

    if (repoFilters.caseId || grouped === false) {
      const { data, total } = await this.auditRepo.findAll(repoFilters);
      const enriched = await this.enrichEvents(data);
      return { data: enriched, total };
    }

    const { data, total } = await this.auditRepo.findGroupedByCase(repoFilters);
    const enriched = await this.enrichEvents(data);
    return { data: this.attachCaseStatus(enriched, data), total };
  }

  async *exportBatches(filters: Omit<AuditListFilters, "offset" | "limit" | "grouped">) {
    for await (const batch of this.auditRepo.exportBatches(filters)) {
      const enriched = await this.enrichEvents(batch);
      yield enriched.map((row, index) => ({
        ...row,
        caseStatus: batch[index]?.caseStatus ?? null,
      }));
    }
  }
}
