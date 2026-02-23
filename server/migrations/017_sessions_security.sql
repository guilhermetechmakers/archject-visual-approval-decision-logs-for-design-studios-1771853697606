-- Session Management & Security: enhanced sessions, audit_events, refresh token rotation

-- Add columns to sessions table (SQLite: ALTER TABLE ADD COLUMN)
-- device_name, geo_city, geo_country, platform, expires_at, revoke_reason, jti, metadata
-- Note: sessions already has id, user_id, ip, user_agent, last_active_at, created_at, revoked_at

-- Add session_id to refresh_tokens to link token to session
-- Add rotation_parent_id for reuse detection
ALTER TABLE refresh_tokens ADD COLUMN session_id TEXT;
ALTER TABLE refresh_tokens ADD COLUMN rotation_parent_id TEXT;
ALTER TABLE refresh_tokens ADD COLUMN used_at TEXT;

-- Add columns to sessions (platform: web, ios, android, api, other - validated in app)
ALTER TABLE sessions ADD COLUMN device_name TEXT;
ALTER TABLE sessions ADD COLUMN geo_city TEXT;
ALTER TABLE sessions ADD COLUMN geo_country TEXT;
ALTER TABLE sessions ADD COLUMN platform TEXT DEFAULT 'web';
ALTER TABLE sessions ADD COLUMN expires_at TEXT;
ALTER TABLE sessions ADD COLUMN revoke_reason TEXT;
ALTER TABLE sessions ADD COLUMN jti TEXT;
ALTER TABLE sessions ADD COLUMN metadata TEXT;

-- Create audit_events table for token/session audit trail
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  session_id TEXT REFERENCES sessions(id),
  type TEXT NOT NULL,
  payload TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_events_user ON audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_session ON audit_events(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_type ON audit_events(type);
CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events(created_at);

-- Index for sessions queries
CREATE INDEX IF NOT EXISTS idx_sessions_revoked ON sessions(revoked_at);
CREATE INDEX IF NOT EXISTS idx_sessions_platform ON sessions(platform);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at);
