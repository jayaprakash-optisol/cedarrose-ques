CREATE TABLE IF NOT EXISTS company_requests (
  "CompanyRequestID"  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "OrderID"           VARCHAR(100) NOT NULL,
  "ExternalRef"       VARCHAR(100) NOT NULL,
  "CompanyName"       VARCHAR(255) NOT NULL,
  "Country"           VARCHAR(100) NOT NULL,
  "RiskRating"        VARCHAR(10),
  "IncorporationDate" DATE,
  "LegalStructure"    VARCHAR(100),
  "PrimaryIndustry"   VARCHAR(100),
  "RecipientType"     VARCHAR(50),
  "RecipientEmails"   JSONB NOT NULL DEFAULT '[]'::jsonb,
  "Status"            VARCHAR(20) NOT NULL DEFAULT 'Pending',
  "RawPayload"        JSONB NOT NULL,
  "ReceivedAt"        TIMESTAMP NOT NULL DEFAULT now(),
  "ConsumedAt"        TIMESTAMP,
  "CaseID"            UUID REFERENCES cases("CaseID"),
  "CreatedAt"         TIMESTAMP NOT NULL DEFAULT now(),
  "UpdatedAt"         TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_requests_order_ext_ref
  ON company_requests("OrderID", "ExternalRef");

DO $$ BEGIN
  ALTER TABLE company_requests ADD CONSTRAINT chk_company_requests_risk_rating
    CHECK ("RiskRating" IN ('Low','Medium','High'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
