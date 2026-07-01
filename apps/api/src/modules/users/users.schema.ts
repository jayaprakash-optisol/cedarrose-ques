import { z } from "zod";
import { USER_ROLES } from "../../config/constants.js";

export const inviteUserSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.email(),
  role: z.enum(USER_ROLES as unknown as [string, ...string[]]),
  platforms: z
    .array(
      z.object({
        platform: z.enum(["automation", "questionnaire"]),
        role: z.enum(USER_ROLES as unknown as [string, ...string[]]),
      })
    )
    .optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  role: z.enum(USER_ROLES as unknown as [string, ...string[]]).optional(),
  status: z.enum(["Active", "Inactive", "Pending"]).optional(),
  title: z.string().max(100).optional(),
  platforms: inviteUserSchema.shape.platforms,
});
