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
  caseStatus?: string;
  payload?: Record<string, unknown>;
}

export interface AuditListParams {
  page?: number;
  limit?: number;
  search?: string;
  caseId?: string;
  type?: string;
  from?: string;
  to?: string;
  grouped?: boolean;
}
