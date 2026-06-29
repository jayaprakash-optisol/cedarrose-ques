ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS "DateDispatched" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "FirstOpenedAt" TIMESTAMP;

-- Backfill dispatch time from link-sent audit events, then date received for sent cases
UPDATE cases c
SET "DateDispatched" = COALESCE(
  c."DateDispatched",
  (
    SELECT MIN(a."CreatedAt")
    FROM audit_events a
    WHERE a."CaseID" = c."CaseID"
      AND a."Step" = 5
  ),
  CASE
    WHEN c."Status" IN (
      'SENT', 'OPENED', 'IN PROGRESS',
      'COMPLETED', 'COMPLETED — MISSING DATA', 'EXPIRED'
    ) THEN c."DateReceived"
  END
);

-- Backfill first open from link-verified audit events
UPDATE cases c
SET "FirstOpenedAt" = COALESCE(
  c."FirstOpenedAt",
  (
    SELECT MIN(a."CreatedAt")
    FROM audit_events a
    WHERE a."CaseID" = c."CaseID"
      AND a."Step" = 7
  ),
  CASE
    WHEN c."Status" IN ('OPENED', 'IN PROGRESS', 'COMPLETED', 'COMPLETED — MISSING DATA')
      THEN COALESCE(c."LastActivity", c."DateReceived")
  END
);
