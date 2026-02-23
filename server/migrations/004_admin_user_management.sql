-- Admin User Management: roles, admin_actions, analytics, enhanced invites

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  permissions TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO roles (id, name) VALUES
  ('role-admin', 'Admin'),
  ('role-editor', 'Editor'),
  ('role-reviewer', 'Reviewer'),
  ('role-viewer', 'Viewer'),
  ('role-member', 'Member');

CREATE TABLE IF NOT EXISTS admin_actions (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL REFERENCES admin_users(id),
  admin_email TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_user_id TEXT,
  target_user_email TEXT,
  studio_id TEXT,
  timestamp TEXT DEFAULT (datetime('now')),
  ip_address TEXT,
  reason TEXT,
  payload TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_timestamp ON admin_actions(timestamp);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_type ON admin_actions(action_type);

-- Extend user_invites if needed (add token, sent_at, metadata)
-- SQLite doesn't support ADD COLUMN IF NOT EXISTS easily; use separate migration
-- For now user_invites exists with: id, email, studio_id, role, status, invited_by, expires_at, created_at

CREATE TABLE IF NOT EXISTS analytics_user_metrics (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  active_users_count INTEGER NOT NULL DEFAULT 0,
  invites_sent INTEGER NOT NULL DEFAULT 0,
  suspensions_count INTEGER NOT NULL DEFAULT 0,
  avg_last_login_days REAL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_user_date ON analytics_user_metrics(date);

-- Add last_login_at to users if not exists (SQLite: check via pragma or migration)
-- Users table has: id, first_name, last_name, email, company, created_at, etc.
-- We use user_suspensions for suspended status
