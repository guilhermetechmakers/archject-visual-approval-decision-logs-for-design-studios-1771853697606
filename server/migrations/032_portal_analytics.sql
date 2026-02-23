-- Portal analytics: token views, comments, approvals, exports
CREATE TABLE IF NOT EXISTS portal_analytics (
  id TEXT PRIMARY KEY,
  token_id TEXT NOT NULL REFERENCES client_tokens(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'comment', 'approve', 'export')),
  decision_id TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  locale TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_portal_analytics_token ON portal_analytics(token_id);
CREATE INDEX IF NOT EXISTS idx_portal_analytics_created ON portal_analytics(created_at DESC);
