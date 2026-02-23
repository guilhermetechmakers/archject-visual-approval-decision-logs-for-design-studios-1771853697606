-- Email verification schema for Archject
-- Run against your database (PostgreSQL/MySQL) for production.
-- SQLite version is applied automatically in db.ts for development.

-- Users table additions
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_sent_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_attempts_count INTEGER DEFAULT 0;

-- Email verifications table
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  token_hash VARCHAR(128) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT,
  attempts INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token_hash);
