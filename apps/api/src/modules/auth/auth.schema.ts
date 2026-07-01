import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(false),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8),
});

export const completeRegistrationSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export const updateMeSchema = z
  .object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().max(50).optional(),
    notifyOnSubmission: z.boolean().optional(),
    notifyOnLinkExpiry: z.boolean().optional(),
    notifyOnBlockedDispatch: z.boolean().optional(),
    notifyOnRemindersSent: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "At least one field is required",
  });
