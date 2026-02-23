-- Jobs table for long-running operations (exports, uploads, etc.)
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  user_id TEXT,
  type TEXT NOT NULL CHECK (type IN ('EXPORT_PDF', 'EXPORT_CSV', 'SIGNING', 'UPLOAD', 'GENERIC')),
  payload TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED')),
  cancellable INTEGER NOT NULL DEFAULT 1,
  progress_percent INTEGER,
  current_step TEXT,
  steps TEXT DEFAULT '[]',
  result_urls TEXT DEFAULT '[]',
  error TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  cancelled_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_jobs_project ON jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at);

-- Job history for audit trail
CREATE TABLE IF NOT EXISTS job_history (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  actor TEXT NOT NULL CHECK (actor IN ('SYSTEM', 'USER')),
  action TEXT NOT NULL,
  detail TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_job_history_job ON job_history(job_id);
