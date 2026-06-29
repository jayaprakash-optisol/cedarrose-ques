-- DB-backed OTP store (multi-instance safe)
CREATE TABLE IF NOT EXISTS questionnaire_otps (
  "CaseID"    UUID PRIMARY KEY REFERENCES cases("CaseID") ON DELETE CASCADE,
  "OtpHash"   VARCHAR(64) NOT NULL,
  "Attempts"  INTEGER NOT NULL DEFAULT 0,
  "ExpiresAt" TIMESTAMP NOT NULL
);

-- Faster unread notification lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications("UserID", "Read");

-- Faster response upserts keyed by case + question
CREATE UNIQUE INDEX IF NOT EXISTS idx_responses_case_question
  ON questionnaire_responses("CaseID", "QuestionID")
  WHERE "QuestionID" IS NOT NULL;
