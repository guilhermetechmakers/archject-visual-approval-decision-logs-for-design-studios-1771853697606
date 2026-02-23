-- Drawings & Specs Library: files, versions, attachments

CREATE TABLE IF NOT EXISTS library_files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  filetype TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  uploader_id TEXT,
  uploaded_at TEXT DEFAULT (datetime('now')),
  current_version_id TEXT,
  is_archived INTEGER DEFAULT 0,
  thumbnail_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_library_files_project ON library_files(project_id);
CREATE INDEX IF NOT EXISTS idx_library_files_archived ON library_files(is_archived);

CREATE TABLE IF NOT EXISTS library_file_versions (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL REFERENCES library_files(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  filepath TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  uploaded_at TEXT DEFAULT (datetime('now')),
  uploader_id TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_library_file_versions_file ON library_file_versions(file_id);

CREATE TABLE IF NOT EXISTS library_file_attachments (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL REFERENCES library_files(id) ON DELETE CASCADE,
  decision_id TEXT NOT NULL,
  notes TEXT,
  attached_at TEXT DEFAULT (datetime('now')),
  attached_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_library_file_attachments_file ON library_file_attachments(file_id);
CREATE INDEX IF NOT EXISTS idx_library_file_attachments_decision ON library_file_attachments(decision_id);
