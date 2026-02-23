-- Comments, Mentions & Collaboration: extend portal_comments and notifications

-- comment_mentions: track @mentions in comments
CREATE TABLE IF NOT EXISTS comment_mentions (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL REFERENCES portal_comments(id) ON DELETE CASCADE,
  mentioned_user_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  notified_via_email INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_comment_mentions_comment ON comment_mentions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_user ON comment_mentions(mentioned_user_id);

-- comment_attachments: file references attached to comments
CREATE TABLE IF NOT EXISTS comment_attachments (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL REFERENCES portal_comments(id) ON DELETE CASCADE,
  file_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  filetype TEXT,
  size INTEGER,
  url TEXT,
  uploaded_by TEXT,
  uploaded_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_comment_attachments_comment ON comment_attachments(comment_id);

-- payload_json on notifications for mention metadata (isMention: true)
-- portal_comments: resolved, status, flagged_by added via db.ts ALTER
