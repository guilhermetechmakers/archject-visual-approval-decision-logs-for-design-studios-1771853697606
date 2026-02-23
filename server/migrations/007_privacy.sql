-- Privacy: data exports, deletion requests, audit logs, backups

-- Data exports (account export archives)
CREATE TABLE IF NOT EXISTS data_exports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'processing', 'completed', 'failed')),
  formats TEXT NOT NULL DEFAULT '[]',
  include_data TEXT NOT NULL DEFAULT '[]',
  storage_key TEXT,
  size_bytes INTEGER,
  requested_at TEXT DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT,
  expires_at TEXT,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_data_exports_user ON data_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_data_exports_status ON data_exports(status);

-- Deletion requests
CREATE TABLE IF NOT EXISTS deletion_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled', 'failed')),
  verification_method TEXT,
  scheduled_for TEXT,
  requested_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_deletion_requests_user ON deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON deletion_requests(status);

-- Backups (summary metadata for admin)
CREATE TABLE IF NOT EXISTS backups (
  id TEXT PRIMARY KEY,
  job_timestamp TEXT NOT NULL,
  snapshot_key TEXT,
  retention_until TEXT,
  size_bytes INTEGER,
  status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_backups_job_timestamp ON backups(job_timestamp);

-- Audit logs for privacy-related actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action_type TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
