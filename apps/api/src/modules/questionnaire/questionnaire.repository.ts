import { eq, sql } from "drizzle-orm";
import type { DrizzleDB } from "../../config/database.js";
import { questionnaireResponses } from "../../db/schema/questionnaire-responses.js";
import { questionnaireOtps } from "../../db/schema/questionnaire-otps.js";

export class QuestionnaireRepository {
  constructor(private readonly db: DrizzleDB) {}

  async setOtp(caseId: string, hash: string, expiresAt: Date) {
    await this.db
      .insert(questionnaireOtps)
      .values({ caseId, otpHash: hash, attempts: 0, expiresAt })
      .onConflictDoUpdate({
        target: questionnaireOtps.caseId,
        set: { otpHash: hash, attempts: 0, expiresAt },
      });
  }

  async getOtp(caseId: string) {
    const [row] = await this.db
      .select()
      .from(questionnaireOtps)
      .where(eq(questionnaireOtps.caseId, caseId))
      .limit(1);
    if (!row) return null;
    return { hash: row.otpHash, attempts: row.attempts, expiresAt: row.expiresAt };
  }

  async incrementOtpAttempts(caseId: string) {
    await this.db
      .update(questionnaireOtps)
      .set({ attempts: sql`${questionnaireOtps.attempts} + 1` })
      .where(eq(questionnaireOtps.caseId, caseId));
  }

  async clearOtp(caseId: string) {
    await this.db.delete(questionnaireOtps).where(eq(questionnaireOtps.caseId, caseId));
  }

  async upsertResponses(
    caseId: string,
    responses: Array<{
      questionId?: string;
      sectionId?: string;
      question: string;
      answer?: string;
      mandatory?: boolean;
    }>
  ) {
    if (!responses.length) return;

    const existing = await this.db
      .select()
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.caseId, caseId));

    const byQuestionId = new Map(
      existing.filter((row) => row.questionId).map((row) => [row.questionId!, row]),
    );
    const byQuestionText = new Map(existing.map((row) => [row.question, row]));

    const toInsert: Array<typeof questionnaireResponses.$inferInsert> = [];
    const toUpdate: Array<{ responseId: string; answer?: string }> = [];

    for (const response of responses) {
      const match =
        (response.questionId && byQuestionId.get(response.questionId)) ??
        byQuestionText.get(response.question);

      if (match) {
        toUpdate.push({ responseId: match.responseId, answer: response.answer });
      } else {
        toInsert.push({
          caseId,
          questionId: response.questionId,
          sectionId: response.sectionId,
          question: response.question,
          answer: response.answer,
          mandatory: response.mandatory ?? true,
        });
      }
    }

    await this.db.transaction(async (tx) => {
      if (toInsert.length) {
        await tx.insert(questionnaireResponses).values(toInsert);
      }

      await Promise.all(
        toUpdate.map(({ responseId, answer }) =>
          tx
            .update(questionnaireResponses)
            .set({ answer, updatedAt: new Date() })
            .where(eq(questionnaireResponses.responseId, responseId)),
        ),
      );
    });
  }

  async getResponses(caseId: string) {
    return this.db
      .select()
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.caseId, caseId));
  }
}
