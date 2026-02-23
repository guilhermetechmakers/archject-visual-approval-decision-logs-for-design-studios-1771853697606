-- Exports, Audit Log, and Decision confirmation fields for Archject

-- Export table
CREATE TABLE IF NOT EXISTS exports (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'ready', 'failed')),
  type TEXT NOT NULL CHECK (type IN ('csv', 'pdf', 'merged_pdf', 'signed_pdf', 'zip')),
  file_key TEXT,
  file_name TEXT,
  file_size INTEGER,
  signed INTEGER NOT NULL DEFAULT 0,
  signature_hash TEXT,
  job_id TEXT,
  meta TEXT,
  download_count INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_exports_project ON exports(project_id);
CREATE INDEX IF NOT EXISTS idx_exports_project_created ON exports(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exports_job ON exports(job_id);

-- Audit log / event table
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'client_token', 'system')),
  actor_id TEXT,
  client_token_id TEXT,
  ip_address TEXT,
  action_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  payload TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  immutable INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_audit_log_project ON audit_log(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_reference ON audit_log(reference_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- Decision additions (last_confirmed_at, last_confirmed_by, confirmation_reference_id, confirmed_context)
-- SQLite doesn't support ADD COLUMN IF NOT EXISTS easily; use try/catch in app
ALTER TABLE decisions ADD COLUMN last_confirmed_at TEXT;
ALTER TABLE decisions ADD COLUMN last_confirmed_by TEXT;
ALTER TABLE decisions ADD COLUMN confirmation_reference_id TEXT;
ALTER TABLE decisions ADD COLUMN confirmed_context TEXT CHECK (confirmed_context IN ('internal', 'client_token'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_decisions_confirmation_ref ON decisions(confirmation_reference_id) WHERE confirmation_reference_id IS NOT NULL;

-- Client tokens for no-login tokenized links
CREATE TABLE IF NOT EXISTS client_tokens (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  decision_ids TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'read_approve' CHECK (scope IN ('read', 'read_approve', 'read_only')),
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_client_tokens_project ON client_tokens(project_id);
CREATE INDEX IF NOT EXISTS idx_client_tokens_expires ON client_tokens(expires_at);
