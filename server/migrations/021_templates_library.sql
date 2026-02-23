-- Templates Library: decision templates with versioning, soft delete, apply logs

CREATE TABLE IF NOT EXISTS templates_library (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'FINISHES' CHECK (type IN ('FINISHES', 'LAYOUTS', 'CHANGE_REQUESTS', 'VARIATIONS', 'PERMITS')),
  content_json TEXT,
  tags_json TEXT DEFAULT '[]',
  owner_id TEXT NOT NULL,
  project_id TEXT,
  version INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_archived INTEGER DEFAULT 0,
  is_deleted INTEGER DEFAULT 0,
  reminder_schedule TEXT
);

CREATE INDEX IF NOT EXISTS idx_templates_library_owner ON templates_library(owner_id);
CREATE INDEX IF NOT EXISTS idx_templates_library_project ON templates_library(project_id);
CREATE INDEX IF NOT EXISTS idx_templates_library_type ON templates_library(type);
CREATE INDEX IF NOT EXISTS idx_templates_library_archived ON templates_library(is_archived);
CREATE INDEX IF NOT EXISTS idx_templates_library_deleted ON templates_library(is_deleted);

CREATE TABLE IF NOT EXISTS templates_library_versions (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES templates_library(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  changes_summary TEXT,
  content_snapshot TEXT
);

CREATE INDEX IF NOT EXISTS idx_templates_versions_template ON templates_library_versions(template_id);

CREATE TABLE IF NOT EXISTS project_template_apply_log (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  applied_at TEXT DEFAULT (datetime('now')),
  applied_by TEXT NOT NULL,
  scope_detail TEXT,
  result TEXT DEFAULT 'success'
);

CREATE INDEX IF NOT EXISTS idx_apply_log_project ON project_template_apply_log(project_id);
CREATE INDEX IF NOT EXISTS idx_apply_log_template ON project_template_apply_log(template_id);
