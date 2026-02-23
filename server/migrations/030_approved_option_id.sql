-- Decision Objects: store approved option ID for quick lookup
ALTER TABLE decisions ADD COLUMN approved_option_id TEXT;

CREATE INDEX IF NOT EXISTS idx_decisions_approved_option ON decisions(approved_option_id);
