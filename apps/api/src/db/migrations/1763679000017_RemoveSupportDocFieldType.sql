-- Migrate legacy document-upload questions to file upload and drop support_doc from allowed types.
UPDATE questions
SET "FieldType" = 'file'
WHERE "FieldType" = 'support_doc';

UPDATE questions
SET "TableColumns" = (
  SELECT jsonb_agg(
    CASE
      WHEN col->>'type' = 'support_doc' THEN jsonb_set(col, '{type}', '"file"')
      ELSE col
    END
  )
  FROM jsonb_array_elements("TableColumns") AS col
)
WHERE "TableColumns" IS NOT NULL
  AND "TableColumns"::text LIKE '%support_doc%';

ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_FieldType_check;

ALTER TABLE questions ADD CONSTRAINT questions_FieldType_check CHECK ("FieldType" IN (
  'text','longtext','number','date','dropdown','radio',
  'multiselect','file','table','esign','toggle','url'
));
