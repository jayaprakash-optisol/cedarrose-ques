import type { DrizzleDB } from "../../config/database.js";
import { companies, companyRecipientEmails } from "../schema/companies.js";
import { SEED } from "./ids.js";

export async function seedCompanies(db: DrizzleDB) {
  const now = new Date();

  const companyRows = [
    {
      companyId: SEED.companies.acme,
      companyName: "Acme Trading LLC",
      crisNumber: "UID-44529",
      country: "UAE",
      riskRating: "Low",
      legalStructure: "Limited Liability Company",
      primaryIndustry: "General Trading",
      createdAt: now,
      updatedAt: now,
    },
    {
      companyId: SEED.companies.gulf,
      companyName: "Gulf Supplies WLL",
      crisNumber: "UID-88210",
      country: "Bahrain",
      riskRating: "Medium",
      legalStructure: "With Limited Liability",
      primaryIndustry: "Industrial Supplies",
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const row of companyRows) {
    await db
      .insert(companies)
      .values(row)
      .onConflictDoUpdate({
        target: companies.companyId,
        set: {
          companyName: row.companyName,
          crisNumber: row.crisNumber,
          country: row.country,
          riskRating: row.riskRating,
          legalStructure: row.legalStructure,
          primaryIndustry: row.primaryIndustry,
          updatedAt: now,
        },
      });
  }

  const emails = [
    {
      emailId: SEED.companyEmails.acmePrimary,
      companyId: SEED.companies.acme,
      email: "supplier.contact@acmetrading.example",
      isPrimary: true,
      createdAt: now,
    },
    {
      emailId: SEED.companyEmails.acmeSecondary,
      companyId: SEED.companies.acme,
      email: "compliance@acmetrading.example",
      isPrimary: false,
      createdAt: now,
    },
    {
      emailId: SEED.companyEmails.gulfPrimary,
      companyId: SEED.companies.gulf,
      email: "info@gulfsupplies.example",
      isPrimary: true,
      createdAt: now,
    },
  ];

  for (const row of emails) {
    await db.insert(companyRecipientEmails).values(row).onConflictDoNothing();
  }
}
