CREATE TABLE IF NOT EXISTS sections (
  "SectionID"   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "TemplateID"  UUID NOT NULL REFERENCES templates("TemplateID") ON DELETE CASCADE,
  "Title"       VARCHAR(255) NOT NULL,
  "Description" TEXT,
  "Banner"      TEXT,
  "OrderIndex"  INTEGER NOT NULL DEFAULT 0,
  "CreatedAt"   TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sections_template_id ON sections("TemplateID");
