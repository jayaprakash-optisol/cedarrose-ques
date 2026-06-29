CREATE TABLE IF NOT EXISTS platform_config (
  "ConfigID"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "LinkValidityDays"    INTEGER NOT NULL DEFAULT 10,
  "TokenType"           VARCHAR(15) NOT NULL DEFAULT 'single-use' CHECK ("TokenType" IN ('single-use','time-based')),
  "TokenExpiryValue"    INTEGER NOT NULL DEFAULT 30,
  "TokenExpiryUnit"     VARCHAR(10) NOT NULL DEFAULT 'minutes' CHECK ("TokenExpiryUnit" IN ('hours','minutes')),
  "OtpLength"           INTEGER NOT NULL DEFAULT 6,
  "OtpExpiryMinutes"    INTEGER NOT NULL DEFAULT 10,
  "OtpMaxAttempts"      INTEGER NOT NULL DEFAULT 3,
  "Reminder1Day"        INTEGER NOT NULL DEFAULT 3,
  "Reminder2Day"        INTEGER NOT NULL DEFAULT 5,
  "ReminderFinalDay"    INTEGER NOT NULL DEFAULT 7,
  "ExpiryDay"           INTEGER NOT NULL DEFAULT 10,
  "GamificationEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "Tier1Label"          VARCHAR(100),
  "Tier1Description"    TEXT,
  "Tier2Label"          VARCHAR(100),
  "Tier2Description"    TEXT,
  "AutoProcessA"        BOOLEAN NOT NULL DEFAULT TRUE,
  "ManualProcessB"      BOOLEAN NOT NULL DEFAULT FALSE,
  "AlertCD"             BOOLEAN NOT NULL DEFAULT TRUE,
  "AuditRetentionDays"  INTEGER NOT NULL DEFAULT 365,
  "ExportFormat"        VARCHAR(10) NOT NULL DEFAULT 'csv',
  "StaleHours"          INTEGER NOT NULL DEFAULT 72,
  "UpdatedBy"           UUID REFERENCES users("UserID"),
  "UpdatedAt"           TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS platform_config_singleton ON platform_config ((TRUE));
INSERT INTO platform_config DEFAULT VALUES ON CONFLICT DO NOTHING;
