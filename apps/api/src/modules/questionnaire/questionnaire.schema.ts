import { z } from "zod";

export const verifyLinkSchema = z.object({
  token: z.string().min(1),
});

export const authenticateSchema = z.object({
  token: z.string().min(1),
});

export const otpVerifySchema = z.object({
  token: z.string().min(1),
  otp: z.string().min(4).max(8),
});

export const saveProgressSchema = z.object({
  responses: z.array(
    z.object({
      questionId: z.uuid().optional(),
      sectionId: z.uuid().optional(),
      question: z.string(),
      answer: z.string().optional(),
      mandatory: z.boolean().optional(),
    })
  ),
});
