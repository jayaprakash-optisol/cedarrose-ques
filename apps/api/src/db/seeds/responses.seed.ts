import type { DrizzleDB } from "../../config/database.js";
import { questionnaireResponses } from "../schema/questionnaire-responses.js";
import { SEED } from "./ids.js";

export async function seedQuestionnaireResponses(db: DrizzleDB) {
  const now = new Date();

  const rows = [
    {
      responseId: SEED.responses.inProgress1,
      caseId: SEED.cases.inProgress,
      questionId: SEED.questions.legalName,
      sectionId: SEED.sections.companyInfo,
      question: "Legal company name",
      answer: "Acme Trading LLC",
      mandatory: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      responseId: SEED.responses.inProgress2,
      caseId: SEED.cases.inProgress,
      questionId: SEED.questions.regNumber,
      sectionId: SEED.sections.companyInfo,
      question: "Commercial registration number",
      answer: "CR-1234567",
      mandatory: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      responseId: SEED.responses.completed1,
      caseId: SEED.cases.completed,
      questionId: SEED.questions.legalName,
      sectionId: SEED.sections.companyInfo,
      question: "Legal company name",
      answer: "Gulf Supplies WLL",
      mandatory: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      responseId: SEED.responses.completed2,
      caseId: SEED.cases.completed,
      questionId: SEED.questions.regNumber,
      sectionId: SEED.sections.companyInfo,
      question: "Commercial registration number",
      answer: "BH-998877",
      mandatory: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      responseId: SEED.responses.completed3,
      caseId: SEED.cases.completed,
      questionId: SEED.questions.amlPolicy,
      sectionId: SEED.sections.compliance,
      question: "Do you have a written AML policy?",
      answer: "Yes",
      mandatory: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      responseId: SEED.responses.missing1,
      caseId: SEED.cases.missingData,
      questionId: SEED.questions.legalName,
      sectionId: SEED.sections.companyInfo,
      question: "Legal company name",
      answer: "Gulf Supplies WLL",
      mandatory: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const row of rows) {
    await db.insert(questionnaireResponses).values(row).onConflictDoNothing();
  }
}
