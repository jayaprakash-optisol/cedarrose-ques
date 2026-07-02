import { z } from "zod";
import { RECIPIENT_TYPES } from "../../config/constants.js";

export const createCaseSchema = z.object({
  orderId: z.string().min(1).max(100),
  companyRequestId: z.uuid().optional(),
  subjectName: z.string().min(1).max(255),
  country: z.string().min(1).max(100),
  recipientType: z.enum(RECIPIENT_TYPES as unknown as [string, ...string[]]),
  recipientEmail: z.email().optional(),
  linkValidityHours: z.number().int().min(24).max(72).default(48),
  templateId: z.uuid().optional(),
  analystId: z.uuid().optional(),
});

export const researcherReviewSchema = z.object({
  decision: z.enum(["Approved", "Flagged", "Rejected"]),
  notes: z.string().optional(),
});
