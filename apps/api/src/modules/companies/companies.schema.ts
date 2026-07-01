import { z } from "zod";

export const createCompanySchema = z.object({
  companyName: z.string().min(1).max(100),
  crisNumber: z.string().min(1).max(50),
  country: z.string().optional(),
  riskRating: z.enum(["Low", "Medium", "High"]).optional(),
  recipientEmails: z.array(z.email()).optional(),
});

export const updateCompanySchema = z.object({
  companyName: z.string().min(1).max(100).optional(),
  country: z.string().optional(),
  riskRating: z.enum(["Low", "Medium", "High"]).optional(),
  legalStructure: z.string().optional(),
  primaryIndustry: z.string().optional(),
});
