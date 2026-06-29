export type EventType =
  | "API Call"
  | "Link Event"
  | "Authentication"
  | "Form Activity"
  | "Researcher Action"
  | "API Push";

export type EventStatus = "Success" | "Failed" | "Pending";

export interface AuditEvent {
  id: string;
  timestamp: string;
  caseId: string;
  caseSubject: string;
  caseOrderId: string;
  step: number;
  type: EventType;
  description: string;
  triggeredBy: string;
  status: EventStatus;
  payload?: Record<string, unknown>;
}
