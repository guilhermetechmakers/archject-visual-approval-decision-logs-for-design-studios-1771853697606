-- Analytics & Reports tables for Archject

-- Projects (minimal for analytics context)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  account_id TEXT,
  studio_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Decisions (for analytics and decision logs)
CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  account_id TEXT,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'finishes' CHECK (type IN ('finishes', 'layout', 'change_request', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'declined', 're_requested')),
  created_at TEXT DEFAULT (datetime('now')),
  decision_made_at TEXT,
  reviewer_id TEXT,
  tags TEXT,
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_decisions_project ON decisions(project_id);
CREATE INDEX IF NOT EXISTS idx_decisions_created ON decisions(created_at);
CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);
CREATE INDEX IF NOT EXISTS idx_decisions_reviewer ON decisions(reviewer_id);

-- Decision events (state transitions, comments)
CREATE TABLE IF NOT EXISTS decision_events (
  id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL REFERENCES decisions(id),
  event_type TEXT NOT NULL,
  actor_id TEXT,
  timestamp TEXT DEFAULT (datetime('now')),
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_decision_events_decision ON decision_events(decision_id);

-- Analytics aggregates (daily rollups)
CREATE TABLE IF NOT EXISTS analytics_aggregates (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  project_id TEXT,
  account_id TEXT,
  decisions_count INTEGER NOT NULL DEFAULT 0,
  median_approval_seconds INTEGER,
  p90_approval_seconds INTEGER,
  pct_within_sla REAL,
  avg_response_seconds INTEGER,
  pending_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_agg_date_project ON analytics_aggregates(date, project_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_agg_date_account ON analytics_aggregates(date, account_id);

-- Alerts (SLA breach notifications)
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('project', 'account', 'global')),
  scope_id TEXT,
  metric TEXT NOT NULL,
  operator TEXT NOT NULL CHECK (operator IN ('>', '<', '>=', '<=', '==')),
  threshold_value REAL NOT NULL,
  frequency_minutes INTEGER NOT NULL DEFAULT 60,
  channels TEXT,
  last_triggered_at TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_alerts_scope ON alerts(scope_type, scope_id);

-- User-facing exports (CSV/JSON)
CREATE TABLE IF NOT EXISTS analytics_exports (
  id TEXT PRIMARY KEY,
  requested_by TEXT NOT NULL,
  scope TEXT NOT NULL,
  filters_json TEXT,
  format TEXT NOT NULL CHECK (format IN ('csv', 'json')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'done', 'failed')),
  s3_key TEXT,
  rows_count INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_analytics_exports_user ON analytics_exports(requested_by);
