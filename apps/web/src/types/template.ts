import type { RecipientType } from "./case";

export type FieldType =
  | "text"
  | "longtext"
  | "number"
  | "date"
  | "dropdown"
  | "radio"
  | "multiselect"
  | "file"
  | "table"
  | "esign"
  | "toggle"
  | "url";

export interface TableColumn {
  name: string;
  type: FieldType;
  required: boolean;
}

export interface Condition {
  enabled: boolean;
  fieldId?: string;
  operator?: "equals" | "not_empty" | "contains";
  value?: string;
}

export interface Validation {
  min?: number;
  max?: number;
  maxLength?: number;
  allowPast?: boolean;
  allowFuture?: boolean;
}

export interface Question {
  id: string;
  text: string;
  type: FieldType;
  required: boolean;
  prefill: boolean;
  options?: string[];
  helpText?: string;
  systemControlled?: boolean;
  note?: string;
  repeater?: boolean;
  attachUpload?: boolean;
  sameAsToggleLabel?: string;
  columns?: TableColumn[];
  validation?: Validation;
  condition?: Condition;
}

export interface Section {
  id: string;
  number: number;
  title: string;
  description?: string;
  banner?: string;
  questions: Question[];
}

export interface Template {
  id: string;
  name: string;
  recipientType: RecipientType;
  status: "Active" | "Draft";
  lastEdited: string;
  editor: string;
  sections: Section[];
}
