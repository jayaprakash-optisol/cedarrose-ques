CREATE TABLE IF NOT EXISTS template_snapshots (
  "SnapshotID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "TemplateID" UUID NOT NULL REFERENCES templates("TemplateID"),
  "Version"    INTEGER NOT NULL,
  "Snapshot"   JSONB NOT NULL,
  "CreatedAt"  TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE ("TemplateID", "Version")
);
