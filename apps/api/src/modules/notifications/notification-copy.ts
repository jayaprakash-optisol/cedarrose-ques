export type NotificationKind = "submission" | "expired" | "blocked" | "reminder" | "review" | "api" | "stale";

export interface CaseNotificationContext {
  caseRef: string;
  orderId: string;
  subjectName: string;
  status?: string;
  completionMandatory?: number;
  remindersSent?: number | null;
  company?: { companyName: string } | null;
}

export function caseDisplayName(c: CaseNotificationContext): string {
  return c.company?.companyName?.trim() || c.subjectName;
}

export function caseLabel(c: CaseNotificationContext): string {
  return `${caseDisplayName(c)} (${c.orderId})`;
}

export function buildNotificationCopy(
  type: NotificationKind,
  c: CaseNotificationContext,
  opts?: { notes?: string; staleHours?: number; reminderNumber?: number },
): { title: string; body: string } {
  const label = caseLabel(c);

  switch (type) {
    case "submission":
      return {
        title: "New submission received",
        body: `${label} submitted their questionnaire. Awaiting researcher review.`,
      };
    case "expired":
      return {
        title: "Questionnaire link expired",
        body: `${label} link expired without submission after the configured period.`,
      };
    case "blocked":
      return {
        title: "Blocked dispatch — action required",
        body: `${label} cannot be dispatched. No company profile or contact email found.`,
      };
    case "review":
      return {
        title: "Researcher review complete",
        body: opts?.notes
          ? `${label} was reviewed. ${opts.notes}`
          : `${label} was approved by the researcher.`,
      };
    case "api":
      return {
        title: "API push completed",
        body: `${label} data was pushed to CedarRose Data Exchange.`,
      };
    case "reminder": {
      const n = opts?.reminderNumber ?? (c.remindersSent ?? 0);
      const isFinal = n >= 3;
      const dayLabel = n === 1 ? "Day 3" : n === 2 ? "Day 5" : "Day 7";
      const pct = c.completionMandatory ?? 0;
      const progress = pct > 0 ? ` Currently ${pct}% complete.` : "";
      return {
        title: isFinal ? "Final reminder sent" : "Reminder sent",
        body: `Reminder ${n} (${dayLabel}) sent to ${label}.${progress}`,
      };
    }
    case "stale":
      return {
        title: "Case activity stalled",
        body: `${label} has had no recipient activity in ${opts?.staleHours ?? 72} hours.`,
      };
    default:
      return {
        title: `Update for ${label}`,
        body: `There is an update for ${label}.`,
      };
  }
}
