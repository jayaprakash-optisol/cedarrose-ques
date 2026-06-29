ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS "Country"            VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "RiskRating"         VARCHAR(10),
  ADD COLUMN IF NOT EXISTS "IncorporationDate"  DATE,
  ADD COLUMN IF NOT EXISTS "LegalStructure"     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "PrimaryIndustry"    VARCHAR(100);

DO $$ BEGIN
  ALTER TABLE companies ADD CONSTRAINT chk_risk_rating CHECK ("RiskRating" IN ('Low','Medium','High'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
