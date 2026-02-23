-- 404 page support: error logs and broken link reports

CREATE TABLE IF NOT EXISTS support_reports (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  email TEXT,
  attempted_path TEXT NOT NULL,
  message TEXT,
  user_agent TEXT,
  attachments TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'triaged', 'closed')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_support_reports_status ON support_reports(status);
CREATE INDEX IF NOT EXISTS idx_support_reports_created ON support_reports(created_at);

CREATE TABLE IF NOT EXISTS error_logs (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL,
  type TEXT NOT NULL,
  message TEXT,
  attempted_path TEXT,
  referrer TEXT,
  user_id TEXT,
  session_id TEXT,
  correlation_id TEXT,
  meta TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(type);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at);
