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

  it("falls back to case completion fields when there are no responses", () => {
    const result = resolveCaseCompletion({
      responses: [],
      completionMandatory: { done: 3, total: 5 },
      completionOptional: { done: 1, total: 4 },
    });
    expect(result.mandatoryPct).toBe(60);
    expect(result.optionalPct).toBe(25);
    expect(result.mandatory).toEqual({ done: 3, total: 5 });
  });

  it("returns 0% when completion totals are zero", () => {
    const result = resolveCaseCompletion({
      responses: [],
      completionMandatory: { done: 0, total: 0 },
      completionOptional: { done: 0, total: 0 },
    });
    expect(result.mandatoryPct).toBe(0);
    expect(result.optionalPct).toBe(0);
  });

  it("returns 0% for zero-total sections when live responses are present", () => {
    const result = resolveCaseCompletion({
      responses: [{ question: "Q1", answer: "yes", mandatory: true }],
      completionMandatory: { done: 0, total: 0 },
      completionOptional: { done: 0, total: 0 },
    });
    // mandatory total > 0 (1 response), optional total = 0
    expect(result.mandatoryPct).toBe(100);
    expect(result.optionalPct).toBe(0);
  });
});
