-- Terms of Service: versioned content and acceptance records

CREATE TABLE IF NOT EXISTS terms_versions (
  id TEXT PRIMARY KEY,
  version_number TEXT NOT NULL,
  slug TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  content_html TEXT,
  effective_date TEXT NOT NULL,
  change_log TEXT DEFAULT '[]',
  published INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_terms_versions_published ON terms_versions(published);
CREATE INDEX IF NOT EXISTS idx_terms_versions_effective ON terms_versions(effective_date);

CREATE TABLE IF NOT EXISTS terms_acceptances (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  version_id TEXT NOT NULL REFERENCES terms_versions(id),
  signup_id TEXT,
  accepted_at TEXT DEFAULT (datetime('now')),
  ip_address TEXT,
  user_agent TEXT,
  metadata TEXT DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_terms_acceptances_user ON terms_acceptances(user_id);
CREATE INDEX IF NOT EXISTS idx_terms_acceptances_version ON terms_acceptances(version_id);
