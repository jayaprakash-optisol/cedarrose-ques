import type { AuditRepository } from "./audit.repository.js";
import type { CasesRepository } from "../cases/cases.repository.js";
import type { UsersRepository } from "../users/users.repository.js";
import type { auditEvents } from "../../db/schema/audit-events.js";

type AuditInsert = typeof auditEvents.$inferInsert;
type AuditRow = typeof auditEvents.$inferSelect;

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
        caseSubject: event.caseSubject ?? c?.subjectName ?? event.caseSubject,
        caseOrderId: event.caseOrderId ?? c?.orderId ?? event.caseOrderId,
        triggeredBy:
          event.triggeredBy ??
          (u ? `${u.firstName} ${u.lastName}`.trim() : undefined) ??
          "System",
      };
    });
  }

  async log(event: AuditInsert) {
    const enriched = await this.enrichEvent(event);
    return this.auditRepo.insert(enriched);
  }

  async list(filters: Parameters<AuditRepository["findAll"]>[0]) {
    const { data, total } = await this.auditRepo.findAll(filters);
    const enriched = await this.enrichEvents(data);
    return { data: enriched, total };
  }

  async export(filters: Parameters<AuditRepository["exportAll"]>[0]) {
    const { data } = await this.auditRepo.findAll({ ...filters, offset: 0, limit: 10000 });
    return this.enrichEvents(data);
  }
}
