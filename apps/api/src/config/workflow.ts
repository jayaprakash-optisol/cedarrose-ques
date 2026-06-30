/** 14-step questionnaire workflow (researcher review removed). */
export const WORKFLOW_STEP = {
  ORDER_RECEIVED: 1,
  FETCH_COMPANY_DATA: 2,
  APPLY_TEMPLATE: 3,
  GENERATE_LINK: 4,
  SEND_LINK: 5,
  RECIPIENT_OPENS_LINK: 6,
  AUTHENTICATION: 7,
  BEGIN_QUESTIONNAIRE: 8,
  SAVE_PROGRESS: 9,
  MANDATORY_COMPLETE: 10,
  SUBMIT: 11,
  SUBMISSION_RECEIVED: 12,
  DATA_MAPPING: 13,
  API_PUSH: 14,
} as const;

export const WORKFLOW_STEP_COUNT = 14;

/** Map stored audit step numbers to the current 14-step workflow. */
export function normalizeWorkflowStep(
  step: number | null | undefined,
  eventType?: string | null,
): number | null {
  if (!step || step < 1) return null;
  if (eventType === "Researcher Action") return null;

  let s = step;
  if (s > 15) {
    const legacy16: Record<number, number> = {
      1: 1,
      2: 1,
      3: 2,
      4: 3,
      5: 5,
      6: 5,
      7: 6,
      8: 7,
      9: 8,
      10: 9,
      11: 10,
      12: 11,
      13: 12,
      14: 13,
      15: 14,
      16: 15,
    };
    s = legacy16[s] ?? 15;
  }

  // Old 15-step flow had researcher review at 13; later steps shift down by one.
  if (s > 13) s -= 1;

  return Math.min(s, WORKFLOW_STEP_COUNT);
}
