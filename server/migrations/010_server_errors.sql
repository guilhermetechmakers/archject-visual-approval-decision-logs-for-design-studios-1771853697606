-- Server errors (500) and support tickets for error triage

CREATE TABLE IF NOT EXISTS server_errors (
  id TEXT PRIMARY KEY,
  correlation_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  user_id TEXT,
  route TEXT NOT NULL,
  method TEXT,
  url TEXT,
  error_message TEXT NOT NULL,
  stack_summary TEXT,
  client_context TEXT,
  tags TEXT,
  resolved INTEGER DEFAULT 0,
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_server_errors_created ON server_errors(created_at);
CREATE INDEX IF NOT EXISTS idx_server_errors_resolved ON server_errors(resolved);
CREATE INDEX IF NOT EXISTS idx_server_errors_correlation ON server_errors(correlation_id);

CREATE TABLE IF NOT EXISTS support_tickets (
  ticket_id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL,
  user_id TEXT,
  email TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'pending')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_incident ON support_tickets(incident_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
