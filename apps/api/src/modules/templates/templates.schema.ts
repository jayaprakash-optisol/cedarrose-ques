import { z } from "zod";

/** Accepts null from JSON/Postgres and treats it as omitted. */
const optionalString = () => z.string().nullish();
const optionalBoolean = () => z.boolean().nullish();
const optionalNumber = () => z.number().nullish();
const optionalStringArray = () => z.array(z.string()).nullish();
const optionalRecord = () => z.record(z.string(), z.unknown()).nullish();

const tableColumnSchema = z.object({
  name: z.string(),
  type: z.string(),
  required: z.boolean(),
});

const questionSchema = z.object({
  label: z.string(),
  fieldType: z.string(),
  mandatory: optionalBoolean(),
  prefill: optionalBoolean(),
  systemControlled: optionalBoolean(),
  repeater: optionalBoolean(),
  attachUpload: optionalBoolean(),
  sameAsToggleLabel: optionalString(),
  note: optionalString(),
  helpText: optionalString(),
  placeholder: optionalString(),
  options: optionalStringArray(),
  tableColumns: z.array(tableColumnSchema).nullish(),
  validation: optionalRecord(),
  condition: optionalRecord(),
  orderIndex: optionalNumber(),
});

const sectionSchema = z.object({
  title: z.string(),
  description: optionalString(),
  banner: optionalString(),
  orderIndex: z.number(),
  questions: z.array(questionSchema).default([]),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1),
  description: optionalString(),
  recipientType: optionalString(),
  sections: z.array(sectionSchema).optional(),
});

export const replaceTemplateSchema = createTemplateSchema.extend({
  sections: z.array(sectionSchema),
});

export const updateTemplateStatusSchema = z.object({
  status: z.enum(["Active", "Draft"]),
});
