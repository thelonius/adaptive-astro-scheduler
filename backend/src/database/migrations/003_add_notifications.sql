-- Add lunar day notification subscription to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_notifications ON users(notifications_enabled)
  WHERE notifications_enabled = true;
