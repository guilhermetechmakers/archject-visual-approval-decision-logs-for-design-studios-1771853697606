import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

const dbPath = path.join(process.cwd(), 'archject.db')
export const db = new Database(dbPath)

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      email_verified INTEGER DEFAULT 0,
      password_hash TEXT NOT NULL,
      company TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      verification_sent_at TEXT,
      verification_attempts_count INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    CREATE TABLE IF NOT EXISTS email_verifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      token_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      used_at TEXT,
      ip_address TEXT,
      user_agent TEXT,
      attempts INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token_hash);
  `)

  const migrationPath = path.join(process.cwd(), 'server', 'migrations', '002_billing.sql')
  if (fs.existsSync(migrationPath)) {
    try {
      const sql = fs.readFileSync(migrationPath, 'utf-8')
      db.exec(sql)
    } catch (e) {
      if (!String(e).includes('already exists')) throw e
    }
    db.prepare(
      "INSERT OR IGNORE INTO studios (id, name, default_currency) VALUES ('default', 'Default Studio', 'USD')"
    ).run()
  }

  const adminMigrationPath = path.join(process.cwd(), 'server', 'migrations', '003_admin.sql')
  if (fs.existsSync(adminMigrationPath)) {
    try {
      const sql = fs.readFileSync(adminMigrationPath, 'utf-8')
      db.exec(sql)
    } catch (e) {
      const msg = String(e)
      if (!msg.includes('already exists') && !msg.includes('duplicate column')) throw e
    }
    seedAdminUser()
  }

  const userMgmtPath = path.join(process.cwd(), 'server', 'migrations', '004_user_management.sql')
  if (fs.existsSync(userMgmtPath)) {
    try {
      const sql = fs.readFileSync(userMgmtPath, 'utf-8')
      db.exec(sql)
    } catch (e) {
      const msg = String(e)
      if (!msg.includes('already exists') && !msg.includes('duplicate column')) throw e
    }
  }
}

function seedAdminUser() {
  const existing = db.prepare('SELECT id FROM admin_users LIMIT 1').get()
  if (existing) return
  const bcrypt = require('bcryptjs')
  const crypto = require('crypto')
  const id = crypto.randomUUID()
  const hash = bcrypt.hashSync('admin123', 10)
  db.prepare(
    "INSERT INTO admin_users (id, email, name, role, password_hash, is_active) VALUES (?, 'admin@archject.local', 'Admin', 'super-admin', ?, 1)"
  ).run(id, hash)
}
