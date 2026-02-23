-- File Upload & Management: scan_status, preview_url for malware/thumbnail pipeline

ALTER TABLE library_files ADD COLUMN scan_status TEXT DEFAULT 'CLEAN';
ALTER TABLE library_files ADD COLUMN preview_url TEXT;

CREATE INDEX IF NOT EXISTS idx_library_files_scan_status ON library_files(scan_status);
