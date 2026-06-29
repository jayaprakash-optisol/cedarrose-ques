import type { DrizzleDB } from "../../config/database.js";
import { users } from "../schema/users.js";
import { userPlatforms } from "../schema/companies.js";
import { hashPassword } from "../../shared/utils/crypto.js";
import { SEED, SEED_PASSWORD } from "./ids.js";

export async function seedUsers(db: DrizzleDB) {
  const password = await hashPassword(SEED_PASSWORD);
  const now = new Date();

  const rows = [
    {
      userId: SEED.users.admin,
      email: "admin@cedarrose.local",
      password,
      firstName: "Alex",
      lastName: "Admin",
      role: "Admin",
      status: "Active",
      title: "Platform Administrator",
      initials: "AA",
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: SEED.users.analyst,
      email: "analyst@cedarrose.local",
      password,
      firstName: "Sarah",
      lastName: "Analyst",
      role: "Analyst",
      status: "Active",
      title: "Senior Analyst",
      initials: "SA",
      totalReports: 42,
      score: "87.50",
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: SEED.users.researcher,
      email: "researcher@cedarrose.local",
      password,
      firstName: "Ravi",
      lastName: "Researcher",
      role: "Researcher",
      status: "Active",
      title: "Compliance Researcher",
      initials: "RR",
      totalReports: 128,
      score: "91.25",
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: SEED.users.reviewer,
      email: "reviewer@cedarrose.local",
      password,
      firstName: "Nina",
      lastName: "Reviewer",
      role: "Reviewer",
      status: "Active",
      title: "QA Reviewer",
      initials: "NR",
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const row of rows) {
    await db
      .insert(users)
      .values(row)
      .onConflictDoUpdate({
        target: users.userId,
        set: {
          email: row.email,
          password: row.password,
          firstName: row.firstName,
          lastName: row.lastName,
          role: row.role,
          status: row.status,
          title: row.title,
          initials: row.initials,
          totalReports: row.totalReports,
          score: row.score,
          updatedAt: now,
        },
      });
  }

  const platforms = [
    {
      platformId: SEED.platforms.adminQuestionnaire,
      userId: SEED.users.admin,
      platform: "questionnaire",
      role: "Admin",
      createdAt: now,
    },
    {
      platformId: SEED.platforms.analystQuestionnaire,
      userId: SEED.users.analyst,
      platform: "questionnaire",
      role: "Analyst",
      createdAt: now,
    },
    {
      platformId: SEED.platforms.researcherQuestionnaire,
      userId: SEED.users.researcher,
      platform: "questionnaire",
      role: "Researcher",
      createdAt: now,
    },
  ];

  for (const p of platforms) {
    await db.insert(userPlatforms).values(p).onConflictDoNothing();
  }
}
