import { subDays } from "date-fns";
import type { DrizzleDB } from "../../config/database.js";
import { auditEvents } from "../schema/audit-events.js";
import { SEED } from "./ids.js";

export async function seedAuditEvents(db: DrizzleDB) {
  const now = new Date();

  const rows = [
    {
      auditId: SEED.audit.caseCreated,
      caseId: SEED.cases.sent,
      caseSubject: "Acme Trading LLC",
      caseOrderId: "ORD-2026-0001",
      step: 1,
      eventType: "API Call",
      description: "Case created (seed)",
      triggeredByUserId: SEED.users.analyst,
      status: "Success",
      createdAt: subDays(now, 1),
    },
    {
      auditId: SEED.audit.linkSent,
      caseId: SEED.cases.sent,
      caseSubject: "Acme Trading LLC",
      caseOrderId: "ORD-2026-0001",
      step: 5,
      eventType: "Link Event",
      description: "Secure link sent to recipient",
      triggeredByUserId: SEED.users.analyst,
      status: "Success",
      createdAt: subDays(now, 1),
    },
    {
      auditId: SEED.audit.formOpened,
      caseId: SEED.cases.inProgress,
      caseSubject: "Acme Trading LLC — Follow-up",
      caseOrderId: "ORD-2026-0002",
      step: 9,
      eventType: "Form Activity",
      description: "Recipient opened questionnaire form",
      status: "Success",
      createdAt: subDays(now, 2),
    },
    {
      auditId: SEED.audit.submitted,
      caseId: SEED.cases.completed,
      caseSubject: "Gulf Supplies WLL",
      caseOrderId: "ORD-2026-0003",
      step: 12,
      eventType: "Form Activity",
      description: "Questionnaire submitted",
      status: "Success",
      createdAt: subDays(now, 1),
    },
    {
      auditId: SEED.audit.reviewPending,
      caseId: SEED.cases.completed,
      caseSubject: "Gulf Supplies WLL",
      caseOrderId: "ORD-2026-0003",
      step: 14,
      eventType: "Researcher Action",
      description: "Awaiting researcher review",
      triggeredByUserId: SEED.users.researcher,
      status: "Pending",
      createdAt: now,
    },
  ];

  for (const row of rows) {
    await db.insert(auditEvents).values(row).onConflictDoNothing();
  }
}
