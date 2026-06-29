CREATE TABLE IF NOT EXISTS cases (
  "CaseID"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "CaseRef"               VARCHAR(20)  NOT NULL UNIQUE,
  "OrderID"               VARCHAR(100) NOT NULL,
  "CompanyID"             UUID REFERENCES companies("CompanyID"),
  "SubjectName"           VARCHAR(255) NOT NULL,
  "Country"               VARCHAR(100) NOT NULL,
  "RecipientType"         VARCHAR(50)  NOT NULL CHECK ("RecipientType" IN (
    'Supplier','Customer','Partner','Business Analytics Report'
  )),
  "Status"                VARCHAR(50)  NOT NULL DEFAULT 'NOT SENT' CHECK ("Status" IN (
    'SENT','OPENED','IN PROGRESS','COMPLETED',
    'COMPLETED — MISSING DATA','PENDING CONTACT',
    'PENDING LINKAGE & CONTACT','EXPIRED','NOT SENT'
  )),
  "CompletionMandatory"   INTEGER NOT NULL DEFAULT 0,
  "CompletionOptional"    INTEGER NOT NULL DEFAULT 0,
  "DateSubmitted"         TIMESTAMP,
  "DateReceived"          TIMESTAMP NOT NULL DEFAULT now(),
  "LastActivity"          TIMESTAMP,
  "AnalystID"             UUID REFERENCES users("UserID"),
  "AssignedResearcherID"  UUID REFERENCES users("UserID"),
  "ResearcherStatus"      VARCHAR(20) CHECK ("ResearcherStatus" IN (
    'Not Applicable','Awaiting Review','Approved','Flagged','Rejected'
  )),
  "ResearcherNotes"       TEXT,
  "ResearcherReviewedAt"  TIMESTAMP,
  "ApiPushStatus"         VARCHAR(10)  DEFAULT 'Pending' CHECK ("ApiPushStatus" IN ('Pending','Success','Failed')),
  "ApiPushAt"             TIMESTAMP,
  "CurrentStep"           INTEGER NOT NULL DEFAULT 1 CHECK ("CurrentStep" BETWEEN 1 AND 16),
  "LinkTokenHash"         TEXT,
  "LinkExpiry"            TIMESTAMP,
  "LinkValidityHours"     INTEGER NOT NULL DEFAULT 48,
  "RemindersSent"         INTEGER NOT NULL DEFAULT 0,
  "ResentCount"           INTEGER NOT NULL DEFAULT 0,
  "TemplateID"            UUID REFERENCES templates("TemplateID"),
  "TemplateVersion"       INTEGER NOT NULL DEFAULT 1,
  "CreatedAt"             TIMESTAMP NOT NULL DEFAULT now(),
  "UpdatedAt"             TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases("Status");
CREATE INDEX IF NOT EXISTS idx_cases_analyst_id ON cases("AnalystID");
CREATE INDEX IF NOT EXISTS idx_cases_researcher_id ON cases("AssignedResearcherID");
CREATE INDEX IF NOT EXISTS idx_cases_company_id ON cases("CompanyID");
CREATE INDEX IF NOT EXISTS idx_cases_link_expiry ON cases("LinkExpiry");
