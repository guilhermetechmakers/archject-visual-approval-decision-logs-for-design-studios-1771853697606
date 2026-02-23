-- User Management (Admin) - Extended schema for Archject

-- Roles table for role-based access
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  permissions TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO roles (id, name) VALUES
  ('admin', 'Admin'),
  ('editor', 'Editor'),
  ('reviewer', 'Reviewer'),
  ('viewer', 'Viewer'),
  ('member', 'Member');

-- Admin actions audit table (detailed audit trail per spec)
CREATE TABLE IF NOT EXISTS admin_actions (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_type ON admin_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_timestamp ON admin_actions(timestamp);

-- Analytics user metrics (aggregated)
CREATE TABLE IF NOT EXISTS analytics_user_metrics (
  date TEXT NOT NULL,
  active_users_count INTEGER NOT NULL DEFAULT 0,
  invites_sent INTEGER NOT NULL DEFAULT 0,
  suspensions_count INTEGER NOT NULL DEFAULT 0,
  avg_last_login_days REAL,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (date)
);
