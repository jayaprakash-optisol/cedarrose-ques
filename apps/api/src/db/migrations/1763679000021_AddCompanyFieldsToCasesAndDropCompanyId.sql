-- Add denormalized company fields to cases (replaces companies FK lookup)
ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS "ExternalRef"       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "RiskRating"        VARCHAR(10),
  ADD COLUMN IF NOT EXISTS "IncorporationDate" DATE,
  ADD COLUMN IF NOT EXISTS "LegalStructure"    VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "PrimaryIndustry"   VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "RecipientEmails"   JSONB,
  ADD COLUMN IF NOT EXISTS "CompanyRequestID"  UUID;

-- Add FK from cases to company_requests
DO $$ BEGIN
  ALTER TABLE cases ADD CONSTRAINT fk_cases_company_request
    FOREIGN KEY ("CompanyRequestID") REFERENCES company_requests("CompanyRequestID");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add new cases index / check constraints
DO $$ BEGIN
  ALTER TABLE cases ADD CONSTRAINT chk_cases_risk_rating
    CHECK ("RiskRating" IN ('Low','Medium','High'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE cases ADD CONSTRAINT chk_cases_completion_optional_range
    CHECK ("CompletionOptional" BETWEEN 0 AND 100);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_cases_company_request_id ON cases("CompanyRequestID");

-- Drop the old FK from cases to companies and the CompanyID column
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'cases'
    AND con.contype = 'f'
    AND con.confrelid = 'companies'::regclass;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE cases DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE cases DROP COLUMN IF EXISTS "CompanyID";
DROP INDEX IF EXISTS idx_cases_company_id;
