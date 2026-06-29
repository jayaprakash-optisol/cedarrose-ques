CREATE TABLE IF NOT EXISTS user_platforms (
  "PlatformID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "UserID"     UUID NOT NULL REFERENCES users("UserID") ON DELETE CASCADE,
  "Platform"   VARCHAR(50) NOT NULL CHECK ("Platform" IN ('automation','questionnaire')),
  "Role"       VARCHAR(20) NOT NULL CHECK ("Role" IN ('Researcher','Reviewer','Analyst','Admin')),
  "CreatedAt"  TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_platforms_user_id ON user_platforms("UserID");
