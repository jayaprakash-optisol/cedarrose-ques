import type { CaseRecord, QuestionnaireResponse } from "@/types/case";

export function countAnswered(responses: QuestionnaireResponse[]) {
  return responses.filter((r) => r.answer?.trim()).length;
}

/** Question counts from saved responses (preferred in detail views). */
export function completionFromResponses(responses: QuestionnaireResponse[]) {
  const mandatory = responses.filter((r) => r.mandatory);
  const optional = responses.filter((r) => !r.mandatory);
  return {
    mandatory: { done: countAnswered(mandatory), total: mandatory.length },
    optional: { done: countAnswered(optional), total: optional.length },
  };
}

/** Use live response counts when available; otherwise fall back to case percentages (0–100). */
export function resolveCaseCompletion(c: Pick<CaseRecord, "responses" | "completionMandatory" | "completionOptional">) {
  if (c.responses.length > 0) {
    const fromResponses = completionFromResponses(c.responses);
    const mandatoryPct = fromResponses.mandatory.total
      ? Math.round((fromResponses.mandatory.done / fromResponses.mandatory.total) * 100)
      : 0;
    const optionalPct = fromResponses.optional.total
      ? Math.round((fromResponses.optional.done / fromResponses.optional.total) * 100)
      : 0;
    return {
      mandatory: fromResponses.mandatory,
      optional: fromResponses.optional,
      overallPct: mandatoryPct,
      mandatoryPct,
      optionalPct,
    };
  }

  const mandatoryPct = c.completionMandatory.total
    ? Math.round((c.completionMandatory.done / c.completionMandatory.total) * 100)
    : 0;
  const optionalPct = c.completionOptional.total
    ? Math.round((c.completionOptional.done / c.completionOptional.total) * 100)
    : 0;

  return {
    mandatory: c.completionMandatory,
    optional: c.completionOptional,
    overallPct: mandatoryPct,
    mandatoryPct,
    optionalPct,
  };
}
