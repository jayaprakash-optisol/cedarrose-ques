CREATE TABLE IF NOT EXISTS questionnaire_responses (
  "ResponseID"   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "CaseID"       UUID NOT NULL REFERENCES cases("CaseID") ON DELETE CASCADE,
  "QuestionID"   UUID REFERENCES questions("QuestionID"),
  "SectionID"    UUID REFERENCES sections("SectionID"),
  "Question"     TEXT NOT NULL,
  "Answer"       TEXT,
  "Mandatory"    BOOLEAN NOT NULL DEFAULT TRUE,
  "Language"     VARCHAR(10),
  "CreatedAt"    TIMESTAMP NOT NULL DEFAULT now(),
  "UpdatedAt"    TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_responses_case_id ON questionnaire_responses("CaseID");
