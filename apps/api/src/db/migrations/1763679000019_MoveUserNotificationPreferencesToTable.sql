CREATE TABLE IF NOT EXISTS user_notification_preferences (
  "UserID"                 UUID PRIMARY KEY REFERENCES users("UserID") ON DELETE CASCADE,
  "NotifyOnSubmission"     BOOLEAN NOT NULL DEFAULT TRUE,
  "NotifyOnLinkExpiry"     BOOLEAN NOT NULL DEFAULT TRUE,
  "NotifyOnBlockedDispatch" BOOLEAN NOT NULL DEFAULT TRUE,
  "NotifyOnRemindersSent"  BOOLEAN NOT NULL DEFAULT TRUE,
  "UpdatedAt"              TIMESTAMP NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'NotifyOnSubmission'
  ) THEN
    INSERT INTO user_notification_preferences (
      "UserID",
      "NotifyOnSubmission",
      "NotifyOnLinkExpiry",
      "NotifyOnBlockedDispatch",
      "NotifyOnRemindersSent"
    )
    SELECT
      "UserID",
      "NotifyOnSubmission",
      "NotifyOnLinkExpiry",
      "NotifyOnBlockedDispatch",
      "NotifyOnRemindersSent"
    FROM users
    ON CONFLICT ("UserID") DO NOTHING;

    ALTER TABLE users
      DROP COLUMN IF EXISTS "NotifyOnSubmission",
      DROP COLUMN IF EXISTS "NotifyOnLinkExpiry",
      DROP COLUMN IF EXISTS "NotifyOnBlockedDispatch",
      DROP COLUMN IF EXISTS "NotifyOnRemindersSent";
  END IF;
END $$;

INSERT INTO user_notification_preferences ("UserID")
SELECT u."UserID"
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_notification_preferences p WHERE p."UserID" = u."UserID"
);
