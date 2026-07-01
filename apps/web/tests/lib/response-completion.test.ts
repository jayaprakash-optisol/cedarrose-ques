import { describe, expect, it } from "vitest";
import {
  completionFromResponses,
  countAnswered,
  resolveCaseCompletion,
} from "@/lib/response-completion";
import { createMockCase, createMockResponse } from "../fixtures/case";

describe("response-completion", () => {
  describe("countAnswered", () => {
    it("returns 0 for empty input", () => {
      expect(countAnswered([])).toBe(0);
    });

    it("counts only responses with non-empty trimmed answer", () => {
      const responses = [
        createMockResponse({ answer: "yes" }),
        createMockResponse({ answer: "" }),
        createMockResponse({ answer: "   " }),
        createMockResponse({ answer: "another" }),
      ];
      expect(countAnswered(responses)).toBe(2);
    });
  });

  describe("completionFromResponses", () => {
    it("returns 0/0 for empty input", () => {
      expect(completionFromResponses([])).toEqual({
        mandatory: { done: 0, total: 0 },
        optional: { done: 0, total: 0 },
      });
    });

    it("splits mandatory vs optional counts", () => {
      const responses = [
        createMockResponse({ mandatory: true, answer: "a" }),
        createMockResponse({ mandatory: true, answer: "" }),
        createMockResponse({ mandatory: false, answer: "b" }),
        createMockResponse({ mandatory: false, answer: "c" }),
        createMockResponse({ mandatory: false, answer: "" }),
      ];
      expect(completionFromResponses(responses)).toEqual({
        mandatory: { done: 1, total: 2 },
        optional: { done: 2, total: 3 },
      });
    });
  });

  describe("resolveCaseCompletion", () => {
    it("uses response counts when responses are present", () => {
      const c = createMockCase({
        responses: [
          createMockResponse({ mandatory: true, answer: "a" }),
          createMockResponse({ mandatory: true, answer: "" }),
          createMockResponse({ mandatory: false, answer: "b" }),
          createMockResponse({ mandatory: false, answer: "" }),
        ],
        completionMandatory: { done: 0, total: 100 },
        completionOptional: { done: 0, total: 100 },
      });
      const out = resolveCaseCompletion(c);
      expect(out).toEqual({
        mandatory: { done: 1, total: 2 },
        optional: { done: 1, total: 2 },
        overallPct: 50,
        mandatoryPct: 50,
        optionalPct: 50,
      });
    });

    it("returns 0% for responses whose only mandatory field is unanswered (empty total)", () => {
      const c2 = createMockCase({
        responses: [createMockResponse({ mandatory: true, answer: "" })],
        completionMandatory: { done: 0, total: 0 },
        completionOptional: { done: 0, total: 0 },
      });
      const out = resolveCaseCompletion(c2);
      expect(out.overallPct).toBe(0);
      expect(out.mandatoryPct).toBe(0);
      expect(out.optionalPct).toBe(0);
    });

    it("returns 0% when responses exist but have no mandatory items", () => {
      const c = createMockCase({
        responses: [createMockResponse({ mandatory: false, answer: "x" })],
        completionMandatory: { done: 0, total: 100 },
        completionOptional: { done: 0, total: 100 },
      });
      const out = resolveCaseCompletion(c);
      expect(out.mandatoryPct).toBe(0);
      expect(out.optionalPct).toBe(100);
    });

    it("returns 0% when responses exist but have no optional items", () => {
      const c = createMockCase({
        responses: [createMockResponse({ mandatory: true, answer: "x" })],
        completionMandatory: { done: 0, total: 100 },
        completionOptional: { done: 0, total: 100 },
      });
      const out = resolveCaseCompletion(c);
      expect(out.mandatoryPct).toBe(100);
      expect(out.optionalPct).toBe(0);
    });

    it("returns 0% for empty responses with all-answered totals", () => {
      const c = createMockCase({
        responses: [createMockResponse({ mandatory: true, answer: "" })],
        completionMandatory: { done: 0, total: 0 },
        completionOptional: { done: 0, total: 0 },
      });
      const out = resolveCaseCompletion(c);
      expect(out.overallPct).toBe(0);
      expect(out.mandatoryPct).toBe(0);
      expect(out.optionalPct).toBe(0);
    });

    it("falls back to case percentages when responses are empty", () => {
      const c = createMockCase({
        responses: [],
        completionMandatory: { done: 75, total: 100 },
        completionOptional: { done: 25, total: 100 },
      });
      const out = resolveCaseCompletion(c);
      expect(out.overallPct).toBe(75);
      expect(out.mandatoryPct).toBe(75);
      expect(out.optionalPct).toBe(25);
      expect(out.mandatory).toEqual({ done: 75, total: 100 });
      expect(out.optional).toEqual({ done: 25, total: 100 });
    });

    it("uses the case percentage fallback (0) when totals are 0 and responses are empty", () => {
      const c = createMockCase({
        responses: [],
        completionMandatory: { done: 0, total: 0 },
        completionOptional: { done: 0, total: 0 },
      });
      const out = resolveCaseCompletion(c);
      expect(out.overallPct).toBe(0);
      expect(out.mandatoryPct).toBe(0);
      expect(out.optionalPct).toBe(0);
    });
  });
});
