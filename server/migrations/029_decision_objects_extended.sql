-- Decision Objects & Approval Workflow: extended schema for options, cloning, versioning, archival

-- decision_options: image_url, drawing_ids, cost_impact for visual comparison
ALTER TABLE decision_options ADD COLUMN image_url TEXT;
ALTER TABLE decision_options ADD COLUMN drawing_ids TEXT;
ALTER TABLE decision_options ADD COLUMN cost_impact TEXT;

-- decisions: cloning, versioning, archival
ALTER TABLE decisions ADD COLUMN cloned_from_decision_id TEXT;
ALTER TABLE decisions ADD COLUMN version_number INTEGER DEFAULT 1;
ALTER TABLE decisions ADD COLUMN is_archived INTEGER DEFAULT 0;
ALTER TABLE decisions ADD COLUMN archived_at TEXT;
ALTER TABLE decisions ADD COLUMN archived_by TEXT;

CREATE INDEX IF NOT EXISTS idx_decisions_cloned_from ON decisions(cloned_from_decision_id);
CREATE INDEX IF NOT EXISTS idx_decisions_is_archived ON decisions(is_archived);
