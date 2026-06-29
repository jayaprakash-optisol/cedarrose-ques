import type { DrizzleDB } from "../../config/database.js";
import { templates } from "../schema/templates.js";
import { sections } from "../schema/sections.js";
import { questions } from "../schema/questions.js";
import { SEED } from "./ids.js";

export async function seedTemplates(db: DrizzleDB) {
  const now = new Date();

  await db
    .insert(templates)
    .values({
      templateId: SEED.templates.supplierActive,
      name: "Supplier Due Diligence Questionnaire",
      description: "Standard supplier onboarding questionnaire for UAE/GCC vendors.",
      status: "Active",
      recipientType: "Supplier",
      version: 1,
      createdBy: SEED.users.admin,
      updatedBy: SEED.users.admin,
      lastEditedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: templates.templateId,
      set: {
        name: "Supplier Due Diligence Questionnaire",
        status: "Active",
        updatedBy: SEED.users.admin,
        lastEditedAt: now,
        updatedAt: now,
      },
    });

  await db
    .insert(templates)
    .values({
      templateId: SEED.templates.customerDraft,
      name: "Customer KYC Questionnaire",
      description: "Draft template for customer onboarding (not yet active).",
      status: "Draft",
      recipientType: "Customer",
      version: 1,
      createdBy: SEED.users.admin,
      updatedBy: SEED.users.admin,
      lastEditedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  const sectionRows = [
    {
      sectionId: SEED.sections.companyInfo,
      templateId: SEED.templates.supplierActive,
      title: "Company Information",
      description: "Basic legal and registration details",
      orderIndex: 0,
      createdAt: now,
    },
    {
      sectionId: SEED.sections.compliance,
      templateId: SEED.templates.supplierActive,
      title: "Compliance & AML",
      description: "Anti-money laundering and sanctions screening",
      banner: "Please provide accurate regulatory information.",
      orderIndex: 1,
      createdAt: now,
    },
  ];

  for (const s of sectionRows) {
    await db.insert(sections).values(s).onConflictDoNothing();
  }

  const questionRows = [
    {
      questionId: SEED.questions.legalName,
      sectionId: SEED.sections.companyInfo,
      label: "Legal company name",
      fieldType: "text",
      mandatory: true,
      prefill: true,
      placeholder: "As per trade licence",
      orderIndex: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      questionId: SEED.questions.regNumber,
      sectionId: SEED.sections.companyInfo,
      label: "Commercial registration number",
      fieldType: "text",
      mandatory: true,
      orderIndex: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      questionId: SEED.questions.countryOps,
      sectionId: SEED.sections.companyInfo,
      label: "Countries of operation",
      fieldType: "multiselect",
      mandatory: true,
      options: ["UAE", "Saudi Arabia", "Bahrain", "Oman", "Qatar"],
      orderIndex: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      questionId: SEED.questions.amlPolicy,
      sectionId: SEED.sections.compliance,
      label: "Do you have a written AML policy?",
      fieldType: "radio",
      mandatory: true,
      options: ["Yes", "No", "In progress"],
      orderIndex: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      questionId: SEED.questions.sanctions,
      sectionId: SEED.sections.compliance,
      label: "Sanctions screening process description",
      fieldType: "longtext",
      mandatory: false,
      helpText: "Describe how you screen customers and suppliers against sanctions lists.",
      orderIndex: 1,
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const q of questionRows) {
    await db.insert(questions).values(q).onConflictDoNothing();
  }
}
