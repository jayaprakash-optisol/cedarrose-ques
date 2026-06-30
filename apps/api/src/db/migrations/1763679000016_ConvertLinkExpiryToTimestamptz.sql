-- LinkExpiry was stored as TIMESTAMP (no TZ) but read back as UTC wall-clock,
-- causing the UI to show a later expiry than PostgreSQL used for validation.
ALTER TABLE cases
  ALTER COLUMN "LinkExpiry" TYPE TIMESTAMPTZ
  USING CASE
    WHEN "LinkExpiry" IS NULL THEN NULL
    ELSE "LinkExpiry" AT TIME ZONE current_setting('TIMEZONE')
  END;
