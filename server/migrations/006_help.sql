-- Help / Knowledge Base / Support for Archject

-- KB Articles
CREATE TABLE IF NOT EXISTS kb_articles (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  body TEXT NOT NULL,
  tags TEXT,
  featured INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  author_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kb_articles_slug ON kb_articles(slug);
CREATE INDEX IF NOT EXISTS idx_kb_articles_published ON kb_articles(published);
CREATE INDEX IF NOT EXISTS idx_kb_articles_featured ON kb_articles(featured);

-- Onboarding checklist progress
CREATE TABLE IF NOT EXISTS onboarding_checklists (
  id TEXT PRIMARY KEY,
  team_id TEXT,
  user_id TEXT,
  step_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_checklist_team_user ON onboarding_checklists(team_id, user_id);
CREATE INDEX IF NOT EXISTS idx_checklist_step ON onboarding_checklists(step_key);

-- Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  project_id TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  attachments TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'waiting', 'resolved', 'closed')),
  source TEXT NOT NULL DEFAULT 'help-form' CHECK (source IN ('help-form', 'demo', 'landing')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- Uploads (file metadata for support attachments)
CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  uploaded_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_uploads_uploaded_by ON uploads(uploaded_by);
