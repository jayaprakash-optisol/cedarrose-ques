import type { AuditRepository } from "./audit.repository.js";

export class AuditService {
  constructor(private readonly auditRepo: AuditRepository) {}

  async log(event: Parameters<AuditRepository["insert"]>[0]) {
    return this.auditRepo.insert(event);
  }

  async list(filters: Parameters<AuditRepository["findAll"]>[0]) {
    return this.auditRepo.findAll(filters);
  }

  async export(filters: Parameters<AuditRepository["exportAll"]>[0]) {
    return this.auditRepo.exportAll(filters);
  }
}
