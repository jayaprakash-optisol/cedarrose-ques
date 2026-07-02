export enum UserRole {
  RESEARCHER = "Researcher",
  REVIEWER = "Reviewer",
  ANALYST = "Analyst",
  ADMIN = "Admin",
  INTEGRATION = "Integration",
}

export enum UserStatus {
  ACTIVE = "Active",
  INACTIVE = "Inactive",
  PENDING = "Pending",
}

export type CaseStatus = (typeof import("../../config/constants.js").CASE_STATUSES)[number];

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  jti: string;
}

export interface QuestionnaireJwtPayload {
  sub: string;
  caseId: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  jti: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface TableColumnDef {
  name: string;
  type: string;
  required: boolean;
}

export interface ValidationDef {
  min?: number;
  max?: number;
  maxLength?: number;
  allowPast?: boolean;
  allowFuture?: boolean;
}

export interface ConditionDef {
  enabled?: boolean;
  fieldId?: string;
  operator?: string;
  value?: string;
}
