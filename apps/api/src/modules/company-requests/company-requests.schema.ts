import { z } from "zod";
import { RECIPIENT_TYPES } from "../../config/constants.js";

export const webhookCompanyRequestSchema = z.object({
  orderId: z.string().min(1).max(100),
  externalRef: z.string().min(1).max(100),
  companyName: z.string().min(1).max(255),
  country: z.string().min(1).max(100),
  riskRating: z.enum(["Low", "Medium", "High"]).optional(),
  incorporationDate: z.string().optional(),
  legalStructure: z.string().max(100).optional(),
  primaryIndustry: z.string().max(100).optional(),
  recipientType: z.enum(RECIPIENT_TYPES as unknown as [string, ...string[]]).optional(),
  recipientEmails: z.array(z.email()).min(1),
});

export const listCompanyRequestsQuerySchema = z.object({
  status: z.enum(["Pending", "Used"]).optional(),
});

export type WebhookCompanyRequestPayload = z.infer<typeof webhookCompanyRequestSchema>;
