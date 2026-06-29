import type { AuditEvent } from "@/types/audit";
import type { CaseRecord } from "@/types/case";
import { WORKFLOW_STEPS } from "@/config/workflow";
import { absTime } from "@/lib/format";

export const WORKFLOW_STEP_COUNT = WORKFLOW_STEPS.length;

/** Map legacy 16-step audit numbers to the current 15-step workflow. */
export function normalizeWorkflowStep(step: number | null | undefined): number | null {
  if (!step || step < 1) return null;
  if (step <= WORKFLOW_STEP_COUNT) return step;

  const legacyMap: Record<number, number> = {
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

  return legacyMap[step] ?? Math.min(step, WORKFLOW_STEP_COUNT);
}

function mergeStepTimestamp(
  target: Record<number, string>,
  step: number,
  timestamp: string,
) {
  const existing = target[step];
  if (!existing || new Date(timestamp).getTime() < new Date(existing).getTime()) {
    target[step] = timestamp;
  }
}

/** Derive completed steps and the active step from case data and audit events. */
export function buildWorkflowProgress(
  caseRecord: CaseRecord | undefined,
  events: AuditEvent[],
): { currentStep: number; completedAt: (string | null)[] } {
  const stepTimestamps: Record<number, string> = {};

  if (caseRecord?.stepTimestamps) {
    for (const [key, ts] of Object.entries(caseRecord.stepTimestamps)) {
      const step = normalizeWorkflowStep(Number(key));
      if (step) mergeStepTimestamp(stepTimestamps, step, ts);
    }
  }

  for (const event of events) {
    if (event.status !== "Success" || !event.step) continue;
    const step = normalizeWorkflowStep(event.step);
    if (step) mergeStepTimestamp(stepTimestamps, step, event.timestamp);
  }

  const maxCompleted = Object.keys(stepTimestamps).reduce(
    (max, key) => Math.max(max, Number(key)),
    0,
  );

  const derivedCurrent =
    maxCompleted >= WORKFLOW_STEP_COUNT ? WORKFLOW_STEP_COUNT + 1 : maxCompleted + 1;

  const caseStep = normalizeWorkflowStep(caseRecord?.currentStep) ?? 1;
  const currentStep = Math.min(
    Math.max(derivedCurrent, caseStep),
    WORKFLOW_STEP_COUNT + 1,
  );

  const completedAt = WORKFLOW_STEPS.map((_, i) => {
    const ts = stepTimestamps[i + 1];
    return ts ? absTime(ts) : null;
  });

  return { currentStep, completedAt };
}
