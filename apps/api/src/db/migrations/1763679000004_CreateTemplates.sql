CREATE TABLE IF NOT EXISTS templates (
  "TemplateID"     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "Name"           VARCHAR(255) NOT NULL,
  "Description"    TEXT,
  "Status"         VARCHAR(10)  NOT NULL DEFAULT 'Draft' CHECK ("Status" IN ('Active','Draft')),
  "RecipientType"  VARCHAR(50),
  "Version"        INTEGER NOT NULL DEFAULT 1,
  "CreatedBy"      UUID REFERENCES users("UserID"),
  "UpdatedBy"      UUID REFERENCES users("UserID"),
  "LastEditedAt"   TIMESTAMP NOT NULL DEFAULT now(),
  "CreatedAt"      TIMESTAMP NOT NULL DEFAULT now(),
  "UpdatedAt"      TIMESTAMP NOT NULL DEFAULT now()
);
