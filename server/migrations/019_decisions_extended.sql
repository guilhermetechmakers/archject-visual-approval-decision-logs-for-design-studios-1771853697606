-- Extended decisions schema for Create Decision workflow

-- decision_options: options within a decision
CREATE TABLE IF NOT EXISTS decision_options (
  id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_default INTEGER DEFAULT 0,
  is_recommended INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_decision_options_decision ON decision_options(decision_id);

-- Add description to decisions if missing
-- SQLite doesn't support IF NOT EXISTS for columns, use try/catch in app

-- decision_templates: pre-built templates
CREATE TABLE IF NOT EXISTS decision_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_options_json TEXT,
  preview_assets TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- decision_recipients: client recipients for sharing
CREATE TABLE IF NOT EXISTS decision_recipients (
  id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  contact_email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'observer')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_decision_recipients_decision ON decision_recipients(decision_id);

-- decision_reminders: reminder schedule
CREATE TABLE IF NOT EXISTS decision_reminders (
  id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'email' CHECK (type IN ('email', 'in-app')),
  schedule TEXT NOT NULL,
  message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_decision_reminders_decision ON decision_reminders(decision_id);

-- decision_attachments: file references
CREATE TABLE IF NOT EXISTS decision_attachments (
  id TEXT PRIMARY KEY,
  parent_type TEXT NOT NULL CHECK (parent_type IN ('decision', 'option')),
  parent_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  mime_type TEXT,
  size INTEGER,
  uploaded_by TEXT,
  uploaded_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_decision_attachments_parent ON decision_attachments(parent_type, parent_id);

-- decision_audit_log: action history
CREATE TABLE IF NOT EXISTS decision_audit_log (
  id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by TEXT,
  performed_at TEXT DEFAULT (datetime('now')),
  details TEXT
);

CREATE INDEX IF NOT EXISTS idx_decision_audit_decision ON decision_audit_log(decision_id);
