export const STATUS_PRIORITY: Record<string, number> = {
  "PENDING LINKAGE & CONTACT": 0,
  "PENDING CONTACT": 1,
  EXPIRED: 2,
  "IN PROGRESS": 3,
  SENT: 4,
  OPENED: 5,
  "COMPLETED — MISSING DATA": 6,
  "NOT SENT": 7,
  COMPLETED: 8,
};

export const CASE_STATUSES = [
  "SENT",
  "OPENED",
  "IN PROGRESS",
  "COMPLETED",
  "COMPLETED — MISSING DATA",
  "PENDING CONTACT",
  "PENDING LINKAGE & CONTACT",
  "EXPIRED",
  "NOT SENT",
] as const;

export const RECIPIENT_TYPES = [
  "Supplier",
  "Customer",
  "Partner",
  "Business Analytics Report",
] as const;

export const USER_ROLES = ["Researcher", "Reviewer", "Analyst", "Admin"] as const;
