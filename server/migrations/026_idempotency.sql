-- Idempotency keys for long-running operations (e.g. create decision, export)
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_body TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_idempotency_user_endpoint ON idempotency_keys(user_id, endpoint);
