import { describe, it, expect } from "vitest";
import { completionFromResponses, resolveCaseCompletion } from "@/lib/response-completion";

describe("response-completion", () => {
  const responses = [
    { question: "Q1", answer: "yes", mandatory: true },
    { question: "Q2", answer: "", mandatory: true },
    { question: "Q3", answer: "opt", mandatory: false },
  ];

  it("counts mandatory and optional completion", () => {
    expect(completionFromResponses(responses)).toEqual({
      mandatory: { done: 1, total: 2 },
      optional: { done: 1, total: 1 },
    });
  });

  it("derives percentages from live responses when present", () => {
    const result = resolveCaseCompletion({
      responses,
      completionMandatory: { done: 0, total: 100 },
      completionOptional: { done: 0, total: 100 },
    });
    expect(result.mandatoryPct).toBe(50);
    expect(result.optionalPct).toBe(100);
  });
});
