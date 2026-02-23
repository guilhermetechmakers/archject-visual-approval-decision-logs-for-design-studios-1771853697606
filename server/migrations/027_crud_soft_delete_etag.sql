-- CRUD enhancements: soft delete, ETag, audit fields for Projects, Decisions, Files

-- Projects: add deleted_at, description, branding, settings
ALTER TABLE projects ADD COLUMN deleted_at TEXT;
ALTER TABLE projects ADD COLUMN description TEXT;
ALTER TABLE projects ADD COLUMN branding_json TEXT;
ALTER TABLE projects ADD COLUMN settings_json TEXT;
ALTER TABLE projects ADD COLUMN updated_by TEXT;

-- Decisions: add deleted_at, etag, version, description, updated_by
ALTER TABLE decisions ADD COLUMN deleted_at TEXT;
ALTER TABLE decisions ADD COLUMN etag TEXT;
ALTER TABLE decisions ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE decisions ADD COLUMN description TEXT;
ALTER TABLE decisions ADD COLUMN updated_at TEXT;
ALTER TABLE decisions ADD COLUMN updated_by TEXT;

-- Library files: add deleted_at, etag for soft delete and optimistic locking
ALTER TABLE library_files ADD COLUMN deleted_at TEXT;
ALTER TABLE library_files ADD COLUMN etag TEXT;

-- Indexes for soft delete queries
CREATE INDEX IF NOT EXISTS idx_projects_deleted ON projects(deleted_at);
CREATE INDEX IF NOT EXISTS idx_decisions_deleted ON decisions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_library_files_deleted ON library_files(deleted_at);
