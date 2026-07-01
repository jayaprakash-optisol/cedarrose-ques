CREATE TABLE IF NOT EXISTS questions (
  "QuestionID"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "SectionID"           UUID NOT NULL REFERENCES sections("SectionID") ON DELETE CASCADE,
  "Label"               TEXT NOT NULL,
  "FieldType"           VARCHAR(20) NOT NULL CHECK ("FieldType" IN (
    'text','longtext','number','date','dropdown','radio',
    'multiselect','file','table','esign','toggle','url'
  )),
  "Mandatory"           BOOLEAN NOT NULL DEFAULT FALSE,
  "Prefill"             BOOLEAN NOT NULL DEFAULT FALSE,
  "SystemControlled"    BOOLEAN NOT NULL DEFAULT FALSE,
  "Repeater"            BOOLEAN NOT NULL DEFAULT FALSE,
  "AttachUpload"        BOOLEAN NOT NULL DEFAULT FALSE,
  "SameAsToggleLabel"   VARCHAR(200),
  "Note"                TEXT,
  "HelpText"            TEXT,
  "Placeholder"         TEXT,
  "Options"             JSONB,
  "TableColumns"        JSONB,
  "Validation"          JSONB,
  "Condition"           JSONB,
  "OrderIndex"          INTEGER NOT NULL DEFAULT 0,
  "CreatedAt"           TIMESTAMP NOT NULL DEFAULT now(),
  "UpdatedAt"           TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_questions_section_id ON questions("SectionID");
