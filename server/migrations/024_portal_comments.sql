-- Portal comments for client-facing decision discussions
CREATE TABLE IF NOT EXISTS portal_comments (
  id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  parent_comment_id TEXT REFERENCES portal_comments(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL,
  author_name TEXT,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  client_token_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_portal_comments_decision ON portal_comments(decision_id);
CREATE INDEX IF NOT EXISTS idx_portal_comments_parent ON portal_comments(parent_comment_id);
