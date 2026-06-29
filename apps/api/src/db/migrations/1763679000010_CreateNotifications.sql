CREATE TABLE IF NOT EXISTS notifications (
  "NotificationID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "UserID"         UUID REFERENCES users("UserID") ON DELETE CASCADE,
  "Type"           VARCHAR(20) NOT NULL CHECK ("Type" IN (
    'submission','expired','blocked','reminder','review','api'
  )),
  "Title"          VARCHAR(255) NOT NULL,
  "Body"           TEXT NOT NULL,
  "Read"           BOOLEAN NOT NULL DEFAULT FALSE,
  "CaseID"         UUID REFERENCES cases("CaseID"),
  "CreatedAt"      TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications("UserID");
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications("Read");
