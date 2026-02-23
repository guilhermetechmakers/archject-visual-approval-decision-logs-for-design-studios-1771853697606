-- User profile extensions: timezone, locale, bio
-- Studio settings: team members, email templates, webhooks

-- Add profile columns to users if not present
-- (SQLite: ALTER TABLE ADD COLUMN fails if column exists)
-- timezone, locale, bio added via migration loop in db.ts

-- Studio team members (links users to studios with roles)
CREATE TABLE IF NOT EXISTS studio_team_members (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL REFERENCES studios(id),
  user_id TEXT REFERENCES users(id),
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'editor', 'viewer', 'custom')),
  permissions TEXT,
  invited_at TEXT DEFAULT (datetime('now')),
  accepted_at TEXT,
  invited_by TEXT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_studio_team_members_studio ON studio_team_members(studio_id);
CREATE INDEX IF NOT EXISTS idx_studio_team_members_user ON studio_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_studio_team_members_email ON studio_team_members(email);

-- Studio email templates
CREATE TABLE IF NOT EXISTS studio_email_templates (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL REFERENCES studios(id),
  template_key TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(studio_id, template_key)
);

CREATE INDEX IF NOT EXISTS idx_studio_email_templates_studio ON studio_email_templates(studio_id);

-- Webhooks for studio integrations
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL REFERENCES studios(id),
  url TEXT NOT NULL,
  events TEXT NOT NULL DEFAULT '[]',
  secret_hash TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_webhooks_studio ON webhooks(studio_id);

-- Studio integrations (Slack, etc.)
CREATE TABLE IF NOT EXISTS studio_integrations (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL REFERENCES studios(id),
  provider TEXT NOT NULL,
  access_token_enc TEXT,
  refresh_token_enc TEXT,
  metadata TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(studio_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_studio_integrations_studio ON studio_integrations(studio_id);
