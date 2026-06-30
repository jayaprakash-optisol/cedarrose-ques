import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuditService } from "../../../../src/modules/audit/audit.service.js";
import type { AuditRepository } from "../../../../src/modules/audit/audit.repository.js";
import type { CasesRepository } from "../../../../src/modules/cases/cases.repository.js";
import type { UsersRepository } from "../../../../src/modules/users/users.repository.js";
import { WORKFLOW_STEP } from "../../../../src/config/workflow.js";
import {
  createMockAuditRepository,
  createMockCasesRepository,
  createMockUsersRepository,
} from "../../../helpers/mock-repositories.js";
import { createMockCase } from "../../../helpers/mock-case.js";
import { createMockUser } from "../../../helpers/mock-user.js";

describe("AuditService", () => {
  let auditRepo: ReturnType<typeof createMockAuditRepository>;
  let casesRepo: ReturnType<typeof createMockCasesRepository>;
  let usersRepo: ReturnType<typeof createMockUsersRepository>;
  let service: AuditService;

  beforeEach(() => {
    auditRepo = createMockAuditRepository();
    casesRepo = createMockCasesRepository();
    usersRepo = createMockUsersRepository();
    service = new AuditService(
      auditRepo as unknown as AuditRepository,
      casesRepo as unknown as CasesRepository,
      usersRepo as unknown as UsersRepository,
    );
  });

  describe("log", () => {
    it("enriches missing case and user fields before insert", async () => {
      const c = createMockCase();
      const user = createMockUser();
      vi.mocked(casesRepo.findById).mockResolvedValue(c);
      vi.mocked(usersRepo.findById).mockResolvedValue(user);
      vi.mocked(auditRepo.insert).mockResolvedValue({
        auditId: "a1",
        caseId: c.caseId,
        caseSubject: c.subjectName,
        caseOrderId: c.orderId,
        step: WORKFLOW_STEP.ORDER_RECEIVED,
        eventType: "API Call",
        description: "Order received",
        triggeredBy: "Test Analyst",
        triggeredByUserId: user.userId,
        status: "Success",
        payload: null,
        createdAt: new Date(),
      });

      await service.log({
        caseId: c.caseId,
        step: WORKFLOW_STEP.ORDER_RECEIVED,
        eventType: "API Call",
        description: "Order received",
        triggeredByUserId: user.userId,
        status: "Success",
      });

      expect(auditRepo.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          caseSubject: c.subjectName,
          caseOrderId: c.orderId,
          triggeredBy: "Test Analyst",
        }),
      );
    });

    it("defaults triggeredBy to System when user is unknown", async () => {
      vi.mocked(usersRepo.findById).mockResolvedValue(null);
      vi.mocked(auditRepo.insert).mockImplementation(async (event) => ({
        auditId: "a2",
        ...event,
        createdAt: new Date(),
      }));

      await service.log({
        eventType: "System",
        description: "Scheduled job",
        status: "Success",
      });

      expect(auditRepo.insert).toHaveBeenCalledWith(
        expect.objectContaining({ triggeredBy: "System" }),
      );
    });

    it("advances case currentStep on successful workflow step", async () => {
      const c = createMockCase({ currentStep: 1 });
      vi.mocked(casesRepo.findById).mockResolvedValue(c);
      vi.mocked(auditRepo.insert).mockImplementation(async (event) => ({
        auditId: "a3",
        ...event,
        createdAt: new Date(),
      }));

      await service.log({
        caseId: c.caseId,
        step: WORKFLOW_STEP.ORDER_RECEIVED,
        eventType: "API Call",
        description: "Order received",
        status: "Success",
      });

      expect(casesRepo.update).toHaveBeenCalledWith(c.caseId, { currentStep: 2 });
    });

    it("does not advance step when status is not Success", async () => {
      vi.mocked(auditRepo.insert).mockImplementation(async (event) => ({
        auditId: "a4",
        ...event,
        createdAt: new Date(),
      }));

      await service.log({
        caseId: "case",
        step: WORKFLOW_STEP.ORDER_RECEIVED,
        eventType: "API Call",
        description: "Failed",
        status: "Failed",
      });

      expect(casesRepo.update).not.toHaveBeenCalled();
    });

    it("does not advance step when case is already ahead", async () => {
      const c = createMockCase({ currentStep: 5 });
      vi.mocked(casesRepo.findById).mockResolvedValue(c);
      vi.mocked(auditRepo.insert).mockImplementation(async (event) => ({
        auditId: "a4b",
        ...event,
        createdAt: new Date(),
      }));

      await service.log({
        caseId: c.caseId,
        step: WORKFLOW_STEP.ORDER_RECEIVED,
        eventType: "API Call",
        description: "Order received",
        status: "Success",
      });

      expect(casesRepo.update).not.toHaveBeenCalled();
    });

    it("skips case lookup when subject and order id are already set", async () => {
      vi.mocked(auditRepo.insert).mockImplementation(async (event) => ({
        auditId: "a4c",
        ...event,
        createdAt: new Date(),
      }));

      await service.log({
        caseId: "case-1",
        caseSubject: "Preset Subject",
        caseOrderId: "ORD-PRESET",
        eventType: "API Call",
        description: "Preset",
        status: "Success",
      });

      expect(casesRepo.findById).not.toHaveBeenCalled();
    });

    it("leaves case fields unchanged when case lookup fails", async () => {
      vi.mocked(casesRepo.findById).mockResolvedValue(null);
      vi.mocked(auditRepo.insert).mockImplementation(async (event) => ({
        auditId: "a4d",
        ...event,
        createdAt: new Date(),
      }));

      await service.log({
        caseId: "missing",
        eventType: "API Call",
        description: "Missing case",
        status: "Success",
      });

      expect(auditRepo.insert).toHaveBeenCalledWith(
        expect.objectContaining({ triggeredBy: "System" }),
      );
    });
  });

  describe("list", () => {
    it("enriches audit rows with case and user data", async () => {
      const c = createMockCase();
      const user = createMockUser();
      vi.mocked(auditRepo.findAll).mockResolvedValue({
        data: [
          {
            auditId: "a5",
            caseId: c.caseId,
            caseSubject: null,
            caseOrderId: null,
            step: 1,
            eventType: "API Call",
            description: "Order received",
            triggeredBy: null,
            triggeredByUserId: user.userId,
            status: "Success",
            payload: null,
            createdAt: new Date(),
          },
        ],
        total: 1,
      });
      vi.mocked(casesRepo.findById).mockResolvedValue(c);
      vi.mocked(usersRepo.findById).mockResolvedValue(user);

      const result = await service.list({ offset: 0, limit: 10 });

      expect(result.total).toBe(1);
      expect(result.data[0]).toMatchObject({
        caseSubject: c.subjectName,
        caseOrderId: c.orderId,
        triggeredBy: "Test Analyst",
      });
    });

    it("defaults triggeredBy to System when user lookup fails", async () => {
      vi.mocked(auditRepo.findAll).mockResolvedValue({
        data: [
          {
            auditId: "a6",
            caseId: null,
            caseSubject: null,
            caseOrderId: null,
            step: null,
            eventType: "System",
            description: "Job",
            triggeredBy: null,
            triggeredByUserId: "missing-user",
            status: "Success",
            payload: null,
            createdAt: new Date(),
          },
        ],
        total: 1,
      });
      vi.mocked(usersRepo.findById).mockResolvedValue(null);

      const result = await service.list({ offset: 0, limit: 10 });
      expect(result.data[0].triggeredBy).toBe("System");
    });
  });

  describe("export", () => {
    it("returns enriched events for export", async () => {
      vi.mocked(auditRepo.findAll).mockResolvedValue({ data: [], total: 0 });
      await expect(service.export({})).resolves.toEqual([]);
      expect(auditRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 0, limit: 10000 }),
      );
    });
  });
});
