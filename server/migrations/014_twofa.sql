-- Two-Factor Authentication (2FA) tables and user extensions

-- Extend users table for 2FA
-- SQLite: add columns one by one with try/catch in db.ts
-- 2fa_enabled, 2fa_method, phone_number, 2fa_recovery_generated_at

-- recovery_codes: one-time backup codes (hashed)
CREATE TABLE IF NOT EXISTS recovery_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  code_hash TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_recovery_codes_user ON recovery_codes(user_id);

-- sms_otps: SMS OTP for enable flow and login
CREATE TABLE IF NOT EXISTS sms_otps (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  phone_number TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts_remaining INTEGER DEFAULT 5,
  created_at TEXT DEFAULT (datetime('now')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_sms_otps_phone ON sms_otps(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_otps_user ON sms_otps(user_id);

-- device_tokens: remember this device (skip 2FA)
CREATE TABLE IF NOT EXISTS device_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  device_name TEXT,
  token_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  last_used_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_hash ON device_tokens(token_hash);

-- session_temp_tokens: temporary token when primary auth passed but 2FA pending
CREATE TABLE IF NOT EXISTS session_temp_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_temp_tokens_hash ON session_temp_tokens(token_hash);

-- tenant_settings: workspace-level require 2FA
CREATE TABLE IF NOT EXISTS tenant_settings (
  tenant_id TEXT PRIMARY KEY,
  require_2fa INTEGER DEFAULT 0,
  require_2fa_grace_period_days INTEGER DEFAULT 7
);

-- 2fa_verify_attempts: rate limit / lockout tracking
CREATE TABLE IF NOT EXISTS twofa_verify_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  ip TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_twofa_attempts_user ON twofa_verify_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_twofa_attempts_ip ON twofa_verify_attempts(ip);
