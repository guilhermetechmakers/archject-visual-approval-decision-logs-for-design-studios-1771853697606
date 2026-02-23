-- Client tokens: revocation, allowed_actions, last_used_at, client_identity_hint
ALTER TABLE client_tokens ADD COLUMN revoked INTEGER NOT NULL DEFAULT 0;
ALTER TABLE client_tokens ADD COLUMN allowed_actions TEXT DEFAULT '["view","comment","approve","export"]';
ALTER TABLE client_tokens ADD COLUMN last_used_at TEXT;
ALTER TABLE client_tokens ADD COLUMN client_identity_hint TEXT;
ALTER TABLE client_tokens ADD COLUMN created_by TEXT;
