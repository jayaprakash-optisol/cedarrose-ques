CREATE TABLE IF NOT EXISTS audit_events (
  "AuditID"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "CaseID"         UUID REFERENCES cases("CaseID"),
  "CaseSubject"    VARCHAR(255),
  "CaseOrderID"    VARCHAR(100),
  "Step"           INTEGER CHECK ("Step" BETWEEN 1 AND 16),
  "EventType"      VARCHAR(30) NOT NULL CHECK ("EventType" IN (
    'API Call','Link Event','Authentication','Form Activity','Researcher Action','API Push'
  )),
  "Description"    TEXT NOT NULL,
  "TriggeredBy"    VARCHAR(255),
  "TriggeredByUserID" UUID REFERENCES users("UserID"),
  "Status"         VARCHAR(10) NOT NULL DEFAULT 'Success' CHECK ("Status" IN ('Success','Failed','Pending')),
  "Payload"        JSONB,
  "CreatedAt"      TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_case_id ON audit_events("CaseID");
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_events("CreatedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_events("EventType");
