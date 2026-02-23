-- Search & Filter: search index and saved searches

CREATE TABLE IF NOT EXISTS search_index (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('project', 'decision', 'template', 'file')),
  title TEXT NOT NULL,
  snippet TEXT,
  content TEXT,
  project_id TEXT,
  status TEXT,
  assignee_id TEXT,
  tags TEXT,
  created_at TEXT,
  updated_at TEXT,
  workspace_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_search_index_type ON search_index(type);
CREATE INDEX IF NOT EXISTS idx_search_index_project ON search_index(project_id);
CREATE INDEX IF NOT EXISTS idx_search_index_status ON search_index(status);
CREATE INDEX IF NOT EXISTS idx_search_index_assignee ON search_index(assignee_id);
CREATE INDEX IF NOT EXISTS idx_search_index_created ON search_index(created_at);

CREATE TABLE IF NOT EXISTS saved_searches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  payload TEXT NOT NULL,
  content_type TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);
