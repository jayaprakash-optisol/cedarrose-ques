CREATE TABLE IF NOT EXISTS company_recipient_emails (
  "EmailID"    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "CompanyID"  UUID NOT NULL REFERENCES companies("CompanyID") ON DELETE CASCADE,
  "Email"      VARCHAR(255) NOT NULL,
  "IsPrimary"  BOOLEAN NOT NULL DEFAULT FALSE,
  "CreatedAt"  TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_company_emails_company_id ON company_recipient_emails("CompanyID");
