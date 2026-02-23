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

  const analyticsPath = path.join(process.cwd(), 'server', 'migrations', '005_analytics.sql')
  if (fs.existsSync(analyticsPath)) {
    try {
      const sql = fs.readFileSync(analyticsPath, 'utf-8')
      db.exec(sql)
    } catch (e) {
      const msg = String(e)
      if (!msg.includes('already exists') && !msg.includes('duplicate column')) throw e
    }
    seedAnalyticsData()
  }

  const helpPath = path.join(process.cwd(), 'server', 'migrations', '006_help.sql')
  if (fs.existsSync(helpPath)) {
    try {
      const sql = fs.readFileSync(helpPath, 'utf-8')
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
      for (const stmt of statements) {
        try {
          db.exec(stmt + ';')
        } catch (e) {
          const msg = String(e)
          if (!msg.includes('already exists') && !msg.includes('duplicate column name')) throw e
        }
      }
    } catch (e) {
      const msg = String(e)
      if (!msg.includes('already exists') && !msg.includes('duplicate column')) throw e
    }
    seedKbArticles()
  }

  const privacyPath = path.join(process.cwd(), 'server', 'migrations', '007_privacy.sql')
  if (fs.existsSync(privacyPath)) {
    try {
      const sql = fs.readFileSync(privacyPath, 'utf-8')
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
      for (const stmt of statements) {
        try {
          db.exec(stmt + ';')
        } catch (e) {
          const msg = String(e)
          if (!msg.includes('already exists') && !msg.includes('duplicate column name')) throw e
        }
      }
    } catch (e) {
      const msg = String(e)
      if (!msg.includes('already exists') && !msg.includes('duplicate column')) throw e
    }
  }

  const termsPath = path.join(process.cwd(), 'server', 'migrations', '008_terms.sql')
  if (fs.existsSync(termsPath)) {
    try {
      const sql = fs.readFileSync(termsPath, 'utf-8')
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
      for (const stmt of statements) {
        try {
          db.exec(stmt + ';')
        } catch (e) {
          const msg = String(e)
          if (!msg.includes('already exists') && !msg.includes('duplicate column name')) throw e
        }
      }
    } catch (e) {
      const msg = String(e)
      if (!msg.includes('already exists') && !msg.includes('duplicate column')) throw e
    }
    seedTermsVersion()
  }

  const support404Path = path.join(process.cwd(), 'server', 'migrations', '009_404_support.sql')
  if (fs.existsSync(support404Path)) {
    try {
      const sql = fs.readFileSync(support404Path, 'utf-8')
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
      for (const stmt of statements) {
        try {
          db.exec(stmt + ';')
        } catch (e) {
          const msg = String(e)
          if (!msg.includes('already exists') && !msg.includes('duplicate column name')) throw e
        }
      }
    } catch (e) {
      const msg = String(e)
      if (!msg.includes('already exists') && !msg.includes('duplicate column')) throw e
    }
  }

  const serverErrorsPath = path.join(process.cwd(), 'server', 'migrations', '010_server_errors.sql')
  if (fs.existsSync(serverErrorsPath)) {
    try {
      const sql = fs.readFileSync(serverErrorsPath, 'utf-8')
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
      for (const stmt of statements) {
        try {
          db.exec(stmt + ';')
        } catch (e) {
          const msg = String(e)
          if (!msg.includes('already exists') && !msg.includes('duplicate column name')) throw e
        }
      }
    } catch (e) {
      const msg = String(e)
      if (!msg.includes('already exists') && !msg.includes('duplicate column')) throw e
    }
  }

  const jobsPath = path.join(process.cwd(), 'server', 'migrations', '011_jobs.sql')
  if (fs.existsSync(jobsPath)) {
    try {
      const sql = fs.readFileSync(jobsPath, 'utf-8')
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
      for (const stmt of statements) {
        try {
          db.exec(stmt + ';')
        } catch (e) {
          const msg = String(e)
          if (!msg.includes('already exists') && !msg.includes('duplicate column name')) throw e
        }
      }
    } catch (e) {
      const msg = String(e)
      if (!msg.includes('already exists') && !msg.includes('duplicate column')) throw e
    }
  }

  const exportsAuditPath = path.join(process.cwd(), 'server', 'migrations', '012_exports_audit.sql')
  if (fs.existsSync(exportsAuditPath)) {
    try {
      const sql = fs.readFileSync(exportsAuditPath, 'utf-8')
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
      for (const stmt of statements) {
        try {
          db.exec(stmt + ';')
        } catch (e) {
          const msg = String(e)
          if (!msg.includes('already exists') && !msg.includes('duplicate column name')) throw e
        }
      }
    } catch (e) {
      const msg = String(e)
      if (!msg.includes('already exists') && !msg.includes('duplicate column')) throw e
    }
  }

  const authExtendedPath = path.join(process.cwd(), 'server', 'migrations', '013_auth_extended.sql')
  if (fs.existsSync(authExtendedPath)) {
    try {
      const sql = fs.readFileSync(authExtendedPath, 'utf-8')
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
      for (const stmt of statements) {
        try {
          db.exec(stmt + ';')
        } catch (e) {
          const msg = String(e)
          if (!msg.includes('already exists') && !msg.includes('duplicate column name')) throw e
        }
      }
    } catch (e) {
      const msg = String(e)
      if (!msg.includes('already exists') && !msg.includes('duplicate column')) throw e
    }
    // Add role and avatar_url to users if not present
    try {
      db.exec('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "owner"')
    } catch (e) {
      if (!String(e).includes('duplicate column name')) throw e
    }
    try {
      db.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT')
    } catch (e) {
      if (!String(e).includes('duplicate column name')) throw e
    }
  }

  const twofaPath = path.join(process.cwd(), 'server', 'migrations', '014_twofa.sql')
  if (fs.existsSync(twofaPath)) {
    try {
      const sql = fs.readFileSync(twofaPath, 'utf-8')
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
      for (const stmt of statements) {
        try {
          db.exec(stmt + ';')
        } catch (e) {
          const msg = String(e)
          if (!msg.includes('already exists') && !msg.includes('duplicate column name')) throw e
        }
      }
    } catch (e) {
      const msg = String(e)
      if (!msg.includes('already exists') && !msg.includes('duplicate column')) throw e
    }
    // Add 2FA columns to users
    for (const col of [
      '2fa_enabled INTEGER DEFAULT 0',
      '2fa_method TEXT',
      'phone_number TEXT',
      '2fa_recovery_generated_at TEXT',
    ]) {
      try {
        db.exec(`ALTER TABLE users ADD COLUMN ${col}`)
      } catch (e) {
        if (!String(e).includes('duplicate column name')) throw e
      }
    }
  }

  const profileStudioPath = path.join(process.cwd(), 'server', 'migrations', '015_profile_studio.sql')
  if (fs.existsSync(profileStudioPath)) {
    try {
      const sql = fs.readFileSync(profileStudioPath, 'utf-8')
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
      for (const stmt of statements) {
        try {
          db.exec(stmt + ';')
        } catch (e) {
          const msg = String(e)
          if (!msg.includes('already exists') && !msg.includes('duplicate column name')) throw e
        }
      }
    } catch (e) {
      const msg = String(e)
      if (!msg.includes('already exists') && !msg.includes('duplicate column')) throw e
    }
    for (const col of ['timezone TEXT DEFAULT "UTC"', 'locale TEXT DEFAULT "en"', 'bio TEXT']) {
      try {
        db.exec(`ALTER TABLE users ADD COLUMN ${col}`)
      } catch (e) {
        if (!String(e).includes('duplicate column name')) throw e
      }
    }
  }

  // 016: password reset audit columns
  for (const col of [
    'request_ip TEXT',
    'request_user_agent TEXT',
  ]) {
    try {
      db.exec(`ALTER TABLE password_reset_tokens ADD COLUMN ${col}`)
    } catch (e) {
      if (!String(e).includes('duplicate column name')) throw e
    }
  }
  try {
    db.exec('ALTER TABLE users ADD COLUMN last_password_changed_at TEXT')
  } catch (e) {
    if (!String(e).includes('duplicate column name')) throw e
  }

  // 017: sessions security - session enhancements, audit_events, refresh token rotation
  const sessionsSecurityPath = path.join(process.cwd(), 'server', 'migrations', '017_sessions_security.sql')
  if (fs.existsSync(sessionsSecurityPath)) {
    try {
      const sql = fs.readFileSync(sessionsSecurityPath, 'utf-8')
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
      for (const stmt of statements) {
        try {
          db.exec(stmt + ';')
        } catch (e) {
          const msg = String(e)
          if (!msg.includes('already exists') && !msg.includes('duplicate column name')) throw e
        }
      }
    } catch (e) {
      const msg = String(e)
      if (!msg.includes('already exists') && !msg.includes('duplicate column')) throw e
    }
  }

  // 018: leads table for demo/signup capture
  const leadsPath = path.join(process.cwd(), 'server', 'migrations', '018_leads.sql')
  if (fs.existsSync(leadsPath)) {
    try {
      const sql = fs.readFileSync(leadsPath, 'utf-8')
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
      for (const stmt of statements) {
        try {
          db.exec(stmt + ';')
        } catch (e) {
          const msg = String(e)
          if (!msg.includes('already exists') && !msg.includes('duplicate column name')) throw e
        }
      }
    } catch (e) {
      const msg = String(e)
      if (!msg.includes('already exists') && !msg.includes('duplicate column')) throw e
    }
  }

  // 019: extended decisions schema (options, templates, recipients, reminders, audit)
  const decisionsExtPath = path.join(process.cwd(), 'server', 'migrations', '019_decisions_extended.sql')
  if (fs.existsSync(decisionsExtPath)) {
    try {
      const sql = fs.readFileSync(decisionsExtPath, 'utf-8')
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
      for (const stmt of statements) {
        try {
          db.exec(stmt + ';')
        } catch (e) {
          const msg = String(e)
          if (!msg.includes('already exists') && !msg.includes('duplicate column name')) throw e
        }
      }
    } catch (e) {
      const msg = String(e)
      if (!msg.includes('already exists') && !msg.includes('duplicate column')) throw e
    }
    seedDecisionTemplates()
  }

  // 020: Drawings & Specs Library (files, versions, attachments)
  const libraryPath = path.join(process.cwd(), 'server', 'migrations', '020_library_files.sql')
  if (fs.existsSync(libraryPath)) {
    try {
      const sql = fs.readFileSync(libraryPath, 'utf-8')
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
      for (const stmt of statements) {
        try {
          db.exec(stmt + ';')
        } catch (e) {
          const msg = String(e)
          if (!msg.includes('already exists') && !msg.includes('duplicate column name')) throw e
        }
      }
    } catch (e) {
      const msg = String(e)
      if (!msg.includes('already exists') && !msg.includes('duplicate column')) throw e
    }
  }

  // 021: Templates Library (versioning, apply logs)
  const templatesLibPath = path.join(process.cwd(), 'server', 'migrations', '021_templates_library.sql')
  if (fs.existsSync(templatesLibPath)) {
    try {
      const sql = fs.readFileSync(templatesLibPath, 'utf-8')
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
      for (const stmt of statements) {
        try {
          db.exec(stmt + ';')
        } catch (e) {
          const msg = String(e)
          if (!msg.includes('already exists') && !msg.includes('duplicate column name')) throw e
        }
      }
    } catch (e) {
      const msg = String(e)
      if (!msg.includes('already exists') && !msg.includes('duplicate column')) throw e
    }
    seedTemplatesLibrary()
  }

  // 022: Notifications Center (notifications, settings, mutes, reminder templates)
  const notificationsPath = path.join(process.cwd(), 'server', 'migrations', '022_notifications_center.sql')
  if (fs.existsSync(notificationsPath)) {
    try {
      const sql = fs.readFileSync(notificationsPath, 'utf-8')
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
      for (const stmt of statements) {
        try {
          db.exec(stmt + ';')
        } catch (e) {
          const msg = String(e)
          if (!msg.includes('already exists') && !msg.includes('duplicate column name')) throw e
        }
      }
    } catch (e) {
      const msg = String(e)
      if (!msg.includes('already exists') && !msg.includes('duplicate column')) throw e
    }
    seedReminderTemplates()
    seedNotifications()
  }

  // 023: Branding extensions (favicon, client link branding)
  const brandingExtPath = path.join(process.cwd(), 'server', 'migrations', '023_branding_extended.sql')
  if (fs.existsSync(brandingExtPath)) {
    try {
      const sql = fs.readFileSync(brandingExtPath, 'utf-8')
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
      for (const stmt of statements) {
        try {
          db.exec(stmt + ';')
        } catch (e) {
          const msg = String(e)
          if (!msg.includes('already exists') && !msg.includes('duplicate column')) throw e
        }
      }
    } catch (e) {
      const msg = String(e)
      if (!msg.includes('already exists') && !msg.includes('duplicate column')) throw e
    }
  }

  // 024: Portal comments for client-facing decision discussions
  const portalCommentsPath = path.join(process.cwd(), 'server', 'migrations', '024_portal_comments.sql')
  if (fs.existsSync(portalCommentsPath)) {
    try {
      const sql = fs.readFileSync(portalCommentsPath, 'utf-8')
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
      for (const stmt of statements) {
        try {
          db.exec(stmt + ';')
        } catch (e) {
          const msg = String(e)
          if (!msg.includes('already exists') && !msg.includes('duplicate column name')) throw e
        }
      }
    } catch (e) {
      const msg = String(e)
      if (!msg.includes('already exists') && !msg.includes('duplicate column')) throw e
    }
  }

  // 025: Search & Filter (search_index, saved_searches)
  const searchPath = path.join(process.cwd(), 'server', 'migrations', '025_search.sql')
  if (fs.existsSync(searchPath)) {
    try {
      const sql = fs.readFileSync(searchPath, 'utf-8')
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
      for (const stmt of statements) {
        try {
          db.exec(stmt + ';')
        } catch (e) {
          const msg = String(e)
          if (!msg.includes('already exists') && !msg.includes('duplicate column name')) throw e
        }
      }
    } catch (e) {
      const msg = String(e)
      if (!msg.includes('already exists') && !msg.includes('duplicate column')) throw e
    }
    backfillSearchIndex()
  }
}

function backfillSearchIndex() {
  try {
    const crypto = require('crypto')
    const now = new Date().toISOString()

    // Projects
    const projects = db.prepare('SELECT id, name, created_at, updated_at FROM projects').all() as {
      id: string
      name: string
      created_at: string
      updated_at: string
    }[]
    const insertIdx = db.prepare(
      `INSERT OR REPLACE INTO search_index (id, document_id, type, title, snippet, content, project_id, status, created_at, updated_at)
       VALUES (?, ?, 'project', ?, ?, ?, ?, 'active', ?, ?)`
    )
    for (const p of projects) {
      const id = `project-${p.id}`
      insertIdx.run(id, p.id, p.name, p.name, p.name, p.id, p.created_at, p.updated_at)
    }

    // Decisions (updated_at may not exist in older schemas)
    type DecisionRow = { id: string; title: string; status: string; created_at: string; updated_at: string; project_id: string; reviewer_id: string | null; tags: string | null }
    let decisions: DecisionRow[]
    try {
      decisions = db.prepare(
        `SELECT d.id, d.title, d.status, d.created_at, COALESCE(d.updated_at, d.created_at) as updated_at, d.project_id, d.reviewer_id, d.tags FROM decisions d`
      ).all() as DecisionRow[]
    } catch {
      decisions = db.prepare(
        `SELECT d.id, d.title, d.created_at as updated_at, d.status, d.created_at, d.project_id, d.reviewer_id, d.tags FROM decisions d`
      ).all() as unknown as DecisionRow[]
    }
    const insertDec = db.prepare(
      `INSERT OR REPLACE INTO search_index (id, document_id, type, title, snippet, content, project_id, status, assignee_id, tags, created_at, updated_at)
       VALUES (?, ?, 'decision', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    for (const d of decisions) {
      const id = `decision-${d.id}`
      const content = [d.title, d.tags].filter(Boolean).join(' ')
      insertDec.run(
        id,
        d.id,
        d.title,
        d.title,
        content,
        d.project_id,
        d.status,
        d.reviewer_id,
        d.tags,
        d.created_at,
        d.updated_at ?? d.created_at
      )
    }

    // Templates
    const templates = db.prepare(
      'SELECT id, name, description, type, tags_json, created_at, updated_at FROM templates_library WHERE is_deleted = 0'
    ).all() as {
      id: string
      name: string
      description: string | null
      type: string
      tags_json: string
      created_at: string
      updated_at: string
    }[]
    const insertTpl = db.prepare(
      `INSERT OR REPLACE INTO search_index (id, document_id, type, title, snippet, content, status, tags, created_at, updated_at)
       VALUES (?, ?, 'template', ?, ?, ?, 'published', ?, ?, ?)`
    )
    for (const t of templates) {
      const id = `template-${t.id}`
      const content = [t.name, t.description, t.tags_json].filter(Boolean).join(' ')
      insertTpl.run(id, t.id, t.name, t.description ?? t.name, content, t.tags_json, t.created_at, t.updated_at)
    }

    // Library files
    const files = db.prepare(
      'SELECT id, filename, project_id, filetype, uploaded_at FROM library_files WHERE is_archived = 0'
    ).all() as {
      id: string
      filename: string
      project_id: string
      filetype: string
      uploaded_at: string
    }[]
    const insertFile = db.prepare(
      `INSERT OR REPLACE INTO search_index (id, document_id, type, title, snippet, content, project_id, status, created_at, updated_at)
       VALUES (?, ?, 'file', ?, ?, ?, ?, 'active', ?, ?)`
    )
    for (const f of files) {
      const id = `file-${f.id}`
      const content = [f.filename, f.filetype].join(' ')
      insertFile.run(id, f.id, f.filename, f.filename, content, f.project_id, f.uploaded_at, f.uploaded_at)
    }
  } catch (e) {
    if (!String(e).includes('UNIQUE')) console.error('[DB] backfillSearchIndex:', e)
  }
}

function seedNotifications() {
  try {
    const hasNotifications = db.prepare('SELECT 1 FROM notifications LIMIT 1').get()
    if (hasNotifications) return
    const crypto = require('crypto')
    const userId = db.prepare('SELECT id FROM users LIMIT 1').get() as { id: string } | undefined
    if (!userId) return
    const projectId = db.prepare('SELECT id FROM projects LIMIT 1').get() as { id: string } | undefined
    const decisionId = db.prepare('SELECT id FROM decisions LIMIT 1').get() as { id: string } | undefined
    const projId = projectId?.id ?? crypto.randomUUID()
    const decId = decisionId?.id ?? crypto.randomUUID()
    const samples = [
      { type: 'approval', title: 'Approval received', message: 'Material selection approved for Riverside Residence', read_at: null },
      { type: 'reminder', title: 'Reminder sent', message: 'Reminder sent to client for layout options', read_at: new Date().toISOString() },
      { type: 'comment', title: 'New comment', message: 'Sarah commented on "Floor plan variations"', read_at: null },
      { type: 'export', title: 'Export completed', message: 'Decision log exported successfully', read_at: new Date().toISOString() },
    ]
    for (const s of samples) {
      db.prepare(
        'INSERT INTO notifications (id, user_id, type, title, message, related_decision_id, related_project_id, read_at, created_at, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(crypto.randomUUID(), userId.id, s.type, s.title, s.message, decId, projId, s.read_at, new Date().toISOString(), 'in_app')
    }
  } catch (e) {
    if (!String(e).includes('UNIQUE')) console.error('[DB] seedNotifications:', e)
  }
}

function seedReminderTemplates() {
  try {
    const hasTemplates = db.prepare('SELECT 1 FROM reminder_templates LIMIT 1').get()
    if (hasTemplates) return
    const crypto = require('crypto')
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    const placeholders = JSON.stringify(['decision_title', 'deadline', 'client_name'])
    const subject = 'Reminder: Decision pending for {decision_title}'
    const bodyHtml = '<p>Hi {client_name},</p><p>This is a reminder that a decision is pending for <strong>{decision_title}</strong>.</p><p>Deadline: {deadline}</p>'
    const bodyText = 'Hi {client_name}, This is a reminder that a decision is pending for {decision_title}. Deadline: {deadline}'
    db.prepare(
      "INSERT INTO reminder_templates (id, name, subject, body_html, body_text, placeholders_json, updated_at) VALUES (?, 'Default Reminder', ?, ?, ?, ?, ?)"
    ).run(id, subject, bodyHtml, bodyText, placeholders, now)
  } catch (e) {
    if (!String(e).includes('UNIQUE')) console.error('[DB] seedReminderTemplates:', e)
  }
}

function seedTemplatesLibrary() {
  try {
    const hasTemplates = db.prepare('SELECT 1 FROM templates_library LIMIT 1').get()
    if (hasTemplates) return
    const crypto = require('crypto')
    const now = new Date().toISOString()
    const ownerId = db.prepare('SELECT id FROM users LIMIT 1').get() as { id: string } | undefined
    const userId = ownerId?.id ?? 'default'
    const templates = [
      {
        id: crypto.randomUUID(),
        name: 'Material selection',
        description: 'Compare material options for finishes, countertops, flooring',
        type: 'FINISHES',
        content_json: JSON.stringify({
          defaultOptions: [
            { title: 'Option A', description: 'First material option', isDefault: false, isRecommended: true },
            { title: 'Option B', description: 'Second material option', isDefault: false, isRecommended: false },
            { title: 'Option C', description: 'Third material option', isDefault: false, isRecommended: false },
          ],
        }),
        tags_json: JSON.stringify(['finishes', 'materials']),
      },
      {
        id: crypto.randomUUID(),
        name: 'Layout options',
        description: 'Floor plan variations and spatial arrangements',
        type: 'LAYOUTS',
        content_json: JSON.stringify({
          defaultOptions: [
            { title: 'Layout A', description: 'First layout variant', isDefault: false, isRecommended: true },
            { title: 'Layout B', description: 'Second layout variant', isDefault: false, isRecommended: false },
          ],
        }),
        tags_json: JSON.stringify(['layouts', 'floor-plans']),
      },
      {
        id: crypto.randomUUID(),
        name: 'Change request',
        description: 'Document change requests and approvals',
        type: 'CHANGE_REQUESTS',
        content_json: JSON.stringify({
          defaultOptions: [
            { title: 'Approve change', description: 'Approve the proposed change', isDefault: false, isRecommended: true },
            { title: 'Request revision', description: 'Request modifications before approval', isDefault: false, isRecommended: false },
            { title: 'Decline', description: 'Decline the change', isDefault: false, isRecommended: false },
          ],
        }),
        tags_json: JSON.stringify(['change-request', 'approval']),
      },
    ]
    const insert = db.prepare(
      `INSERT INTO templates_library (id, name, description, type, content_json, tags_json, owner_id, version, created_at, updated_at, is_archived, is_deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 0, 0)`
    )
    for (const t of templates) {
      insert.run(t.id, t.name, t.description, t.type, t.content_json, t.tags_json, userId, now, now)
    }
  } catch (e) {
    if (!String(e).includes('UNIQUE')) console.error('[DB] seedTemplatesLibrary:', e)
  }
}

function seedDecisionTemplates() {
  try {
    const hasTemplates = db.prepare('SELECT 1 FROM decision_templates LIMIT 1').get()
    if (hasTemplates) return
    const crypto = require('crypto')
    const now = new Date().toISOString()
    const templates = [
      {
        id: crypto.randomUUID(),
        name: 'Material selection',
        description: 'Compare material options for finishes, countertops, flooring',
        default_options_json: JSON.stringify([
          { title: 'Option A', description: 'First material option', isDefault: false, isRecommended: true },
          { title: 'Option B', description: 'Second material option', isDefault: false, isRecommended: false },
          { title: 'Option C', description: 'Third material option', isDefault: false, isRecommended: false },
        ]),
      },
      {
        id: crypto.randomUUID(),
        name: 'Layout options',
        description: 'Floor plan variations and spatial arrangements',
        default_options_json: JSON.stringify([
          { title: 'Layout A', description: 'First layout variant', isDefault: false, isRecommended: true },
          { title: 'Layout B', description: 'Second layout variant', isDefault: false, isRecommended: false },
        ]),
      },
      {
        id: crypto.randomUUID(),
        name: 'Color palette',
        description: 'Paint and finish color selections',
        default_options_json: JSON.stringify([
          { title: 'Palette 1', description: 'Neutral tones', isDefault: false, isRecommended: true },
          { title: 'Palette 2', description: 'Warm tones', isDefault: false, isRecommended: false },
          { title: 'Palette 3', description: 'Cool tones', isDefault: false, isRecommended: false },
          { title: 'Palette 4', description: 'Bold accents', isDefault: false, isRecommended: false },
        ]),
      },
      {
        id: crypto.randomUUID(),
        name: 'Change request',
        description: 'Document change requests and approvals',
        default_options_json: JSON.stringify([
          { title: 'Approve change', description: 'Approve the proposed change', isDefault: false, isRecommended: true },
          { title: 'Request revision', description: 'Request modifications before approval', isDefault: false, isRecommended: false },
          { title: 'Decline', description: 'Decline the change', isDefault: false, isRecommended: false },
        ]),
      },
    ]
    const insert = db.prepare(
      'INSERT INTO decision_templates (id, name, description, default_options_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    for (const t of templates) {
      insert.run(t.id, t.name, t.description, t.default_options_json, now, now)
    }
  } catch (e) {
    if (!String(e).includes('UNIQUE')) console.error('[DB] seedDecisionTemplates:', e)
  }
}

function seedAnalyticsData() {
  try {
    const hasProjects = db.prepare('SELECT 1 FROM projects LIMIT 1').get()
    if (hasProjects) return
    const crypto = require('crypto')
    const projectId = crypto.randomUUID()
    db.prepare(
      'INSERT INTO projects (id, name, account_id, studio_id) VALUES (?, ?, ?, ?)'
    ).run(projectId, 'Riverside Residence', 'default', 'default')
    for (let i = 0; i < 12; i++) {
      const id = crypto.randomUUID()
      const statuses = ['pending', 'in_review', 'approved', 'declined', 're_requested']
      const status = statuses[i % statuses.length]
      const d = new Date()
      d.setDate(d.getDate() - (30 - i * 2))
      const created = d.toISOString()
      const decisionMade = status !== 'pending' && status !== 'in_review' ? new Date(d.getTime() + 3600000 * (i + 1)).toISOString() : null
      db.prepare(
        `INSERT INTO decisions (id, project_id, account_id, title, type, status, created_at, decision_made_at, reviewer_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, projectId, 'default', `Decision ${i + 1}: Sample item`, 'finishes', status, created, decisionMade, 'user-1')
    }
  } catch (e) {
    if (!String(e).includes('UNIQUE')) console.error('[DB] seedAnalyticsData:', e)
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

function seedKbArticles() {
  try {
    const hasArticles = db.prepare('SELECT 1 FROM kb_articles LIMIT 1').get()
    if (hasArticles) return
    const crypto = require('crypto')
    const now = new Date().toISOString()
    const articles = [
      {
        id: crypto.randomUUID(),
        slug: 'getting-started',
        title: 'Getting Started with Archject',
        excerpt: 'Learn how to set up your first project and invite clients.',
        body: `## Welcome to Archject

Archject helps design studios manage visual approvals and decision logs. Follow these steps to get started.

### 1. Create a Project
Go to **Dashboard → Projects** and click **New Project**. Give it a name and optional description.

### 2. Add Decision Options
Inside your project, create a decision with options (e.g., material choices, layout variants). Upload images or attach drawings.

### 3. Share the Client Link
Generate a no-login share link and send it to your client. They can approve or decline directly from their device.

### 4. Export the Decision Log
Once approved, export a PDF or CSV Decision Log for your records and contracts.`,
        tags: JSON.stringify(['Getting Started', 'Onboarding']),
        featured: 1,
        published: 1,
      },
      {
        id: crypto.randomUUID(),
        slug: 'client-link',
        title: 'Client Link & No-Login Approval',
        excerpt: 'How tokenized share links work and how clients approve without creating an account.',
        body: `## Client Links

Client links are tokenized URLs that let your clients view and approve decisions without signing up.

### How It Works
- Each decision can have a unique share link
- The link contains a secure token—no password needed
- Clients see side-by-side options and tap to approve
- All actions are time-stamped for audit trails

### Security
- Links can be regenerated if compromised
- Expiration dates are configurable
- View-only links are available for review-only flows`,
        tags: JSON.stringify(['Client Link', 'Security']),
        featured: 1,
        published: 1,
      },
      {
        id: crypto.randomUUID(),
        slug: 'decision-logs',
        title: 'Decision Logs & Audit Trails',
        excerpt: 'Understand how decisions are logged and exported for legal and compliance.',
        body: `## Decision Logs

Every approval is recorded with a timestamp, client action, and optional comment.

### Export Formats
- **PDF**: Branded, print-ready Decision Log with your studio logo
- **CSV**: Structured data for spreadsheets and integrations

### Use Cases
- Contract documentation
- Permit applications
- Change order tracking
- Client sign-off records`,
        tags: JSON.stringify(['Decision Logs', 'Exports']),
        featured: 0,
        published: 1,
      },
      {
        id: crypto.randomUUID(),
        slug: 'exports',
        title: 'Exporting Decision Logs',
        excerpt: 'Generate PDF and CSV exports with your branding.',
        body: `## Exports

Navigate to **Exports** in the dashboard to generate Decision Logs.

### PDF Export
- Includes your studio branding
- All decisions in the selected project/date range
- Timestamps and client actions
- Optional cover page

### CSV Export
- Structured columns for each field
- Suitable for import into other tools
- Filter by project and date range`,
        tags: JSON.stringify(['Exports', 'Billing']),
        featured: 0,
        published: 1,
      },
      {
        id: crypto.randomUUID(),
        slug: 'security',
        title: 'Security & Data Privacy',
        excerpt: 'How we protect your data and client information.',
        body: `## Security

- All data is encrypted in transit (TLS)
- Access is controlled via authentication and role-based permissions
- Client links use secure, unguessable tokens
- We do not share your data with third parties for marketing`,
        tags: JSON.stringify(['Security']),
        featured: 0,
        published: 1,
      },
    ]
    const insert = db.prepare(
      `INSERT INTO kb_articles (id, slug, title, excerpt, body, tags, featured, published, author_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    for (const a of articles) {
      insert.run(a.id, a.slug, a.title, a.excerpt, a.body, a.tags, a.featured, a.published, null, now, now)
    }
  } catch (e) {
    if (!String(e).includes('UNIQUE')) console.error('[DB] seedKbArticles:', e)
  }
}

function seedTermsVersion() {
  try {
    const hasTerms = db.prepare('SELECT 1 FROM terms_versions LIMIT 1').get()
    if (hasTerms) return
    const crypto = require('crypto')
    const id = crypto.randomUUID()
    const effectiveDate = new Date().toISOString().slice(0, 10)
    const changeLog = JSON.stringify([{ date: effectiveDate, note: 'Initial version' }])
    const content = `## 1. Usage Rules

By using Archject ("Service"), you agree to use it only for lawful purposes and in accordance with these Terms. You must not use the Service to violate any applicable laws, infringe on others' rights, or transmit harmful content. You are responsible for all activity under your account.

## 2. Accounts & Trials

You may create an account to access the Service. We may offer free trials; trial terms will be specified at signup. You must provide accurate information and keep your account secure. You are responsible for maintaining the confidentiality of your credentials.

## 3. Paid Terms

Paid plans are billed according to the pricing in effect at the time of subscription. Fees are non-refundable except as required by law. We may change pricing with reasonable notice; continued use after changes constitutes acceptance.

## 4. Liability Limits

TO THE MAXIMUM EXTENT PERMITTED BY LAW, ARCHJECT AND ITS AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE MONTHS PRECEDING THE CLAIM.

## 5. Intellectual Property

Archject and its licensors retain all rights in the Service, including software, design, and branding. You retain rights in your content. By using the Service, you grant us a limited license to host, process, and display your content as necessary to provide the Service.

## 6. Termination

We may suspend or terminate your access for breach of these Terms or for any reason with notice. You may terminate your account at any time. Upon termination, your right to use the Service ceases. Provisions that by their nature should survive will survive.

## 7. Dispute Resolution

Disputes shall be resolved by binding arbitration in accordance with applicable rules, except where prohibited. You waive the right to participate in class actions. The governing law shall be the laws of the jurisdiction in which Archject is incorporated.

## 8. Changes & Revision History

We may update these Terms from time to time. Material changes will be communicated via email or in-app notice. The "Last updated" date and revision history on this page reflect changes. Continued use after changes constitutes acceptance. You may view prior versions in the Revision History.

## 9. Contact

For questions about these Terms, contact legal@archject.com. For general support, see our Help Center.`
    db.prepare(
      `INSERT INTO terms_versions (id, version_number, slug, content_markdown, effective_date, change_log, published)
       VALUES (?, ?, ?, ?, ?, ?, 1)`
    ).run(id, 'v1.0', `terms-${effectiveDate}`, content, effectiveDate, changeLog)
  } catch (e) {
    if (!String(e).includes('UNIQUE')) console.error('[DB] seedTermsVersion:', e)
  }
}
