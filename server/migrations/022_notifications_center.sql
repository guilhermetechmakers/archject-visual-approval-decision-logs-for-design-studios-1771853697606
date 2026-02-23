-- Notifications Center: notifications, settings, mutes, reminder templates

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('reminder', 'approval', 'comment', 'export')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_decision_id TEXT,
  related_project_id TEXT,
  read_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  source TEXT DEFAULT 'in_app',
  attachments_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read_at);

CREATE TABLE IF NOT EXISTS notification_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  in_app_enabled INTEGER DEFAULT 1,
  email_enabled INTEGER DEFAULT 1,
  default_frequency TEXT DEFAULT 'immediate' CHECK (default_frequency IN ('immediate', 'daily_digest', 'weekly_digest')),
  per_project_settings_json TEXT DEFAULT '[]',
  last_updated TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON notification_settings(user_id);

CREATE TABLE IF NOT EXISTS notification_mutes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  muted_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_mutes_user ON notification_mutes(user_id);

CREATE TABLE IF NOT EXISTS reminder_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  placeholders_json TEXT DEFAULT '[]',
  updated_at TEXT DEFAULT (datetime('now'))
);
