import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
const dbPath = path.join(process.cwd(), 'archject.db');
export const db = new Database(dbPath);
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
  `);
    const migrationPath = path.join(process.cwd(), 'server', 'migrations', '002_billing.sql');
    if (fs.existsSync(migrationPath)) {
        try {
            const sql = fs.readFileSync(migrationPath, 'utf-8');
            db.exec(sql);
        }
        catch (e) {
            if (!String(e).includes('already exists'))
                throw e;
        }
        db.prepare("INSERT OR IGNORE INTO studios (id, name, default_currency) VALUES ('default', 'Default Studio', 'USD')").run();
    }
    const adminMigrationPath = path.join(process.cwd(), 'server', 'migrations', '003_admin.sql');
    if (fs.existsSync(adminMigrationPath)) {
        try {
            const sql = fs.readFileSync(adminMigrationPath, 'utf-8');
            db.exec(sql);
        }
        catch (e) {
            const msg = String(e);
            if (!msg.includes('already exists') && !msg.includes('duplicate column'))
                throw e;
        }
        seedAdminUser();
    }
    const userMgmtPath = path.join(process.cwd(), 'server', 'migrations', '004_user_management.sql');
    if (fs.existsSync(userMgmtPath)) {
        try {
            const sql = fs.readFileSync(userMgmtPath, 'utf-8');
            db.exec(sql);
        }
        catch (e) {
            const msg = String(e);
            if (!msg.includes('already exists') && !msg.includes('duplicate column'))
                throw e;
        }
    }
    const analyticsPath = path.join(process.cwd(), 'server', 'migrations', '005_analytics.sql');
    if (fs.existsSync(analyticsPath)) {
        try {
            const sql = fs.readFileSync(analyticsPath, 'utf-8');
            db.exec(sql);
        }
        catch (e) {
            const msg = String(e);
            if (!msg.includes('already exists') && !msg.includes('duplicate column'))
                throw e;
        }
        seedAnalyticsData();
    }
    const helpPath = path.join(process.cwd(), 'server', 'migrations', '006_help.sql');
    if (fs.existsSync(helpPath)) {
        try {
            const sql = fs.readFileSync(helpPath, 'utf-8');
            const statements = sql
                .split(';')
                .map((s) => s.trim())
                .filter(Boolean);
            for (const stmt of statements) {
                try {
                    db.exec(stmt + ';');
                }
                catch (e) {
                    const msg = String(e);
                    if (!msg.includes('already exists') && !msg.includes('duplicate column name'))
                        throw e;
                }
            }
        }
        catch (e) {
            const msg = String(e);
            if (!msg.includes('already exists') && !msg.includes('duplicate column'))
                throw e;
        }
        seedKbArticles();
    }
}
function seedAnalyticsData() {
    try {
        const hasProjects = db.prepare('SELECT 1 FROM projects LIMIT 1').get();
        if (hasProjects)
            return;
        const crypto = require('crypto');
        const projectId = crypto.randomUUID();
        db.prepare('INSERT INTO projects (id, name, account_id, studio_id) VALUES (?, ?, ?, ?)').run(projectId, 'Riverside Residence', 'default', 'default');
        for (let i = 0; i < 12; i++) {
            const id = crypto.randomUUID();
            const statuses = ['pending', 'in_review', 'approved', 'declined', 're_requested'];
            const status = statuses[i % statuses.length];
            const d = new Date();
            d.setDate(d.getDate() - (30 - i * 2));
            const created = d.toISOString();
            const decisionMade = status !== 'pending' && status !== 'in_review' ? new Date(d.getTime() + 3600000 * (i + 1)).toISOString() : null;
            db.prepare(`INSERT INTO decisions (id, project_id, account_id, title, type, status, created_at, decision_made_at, reviewer_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, projectId, 'default', `Decision ${i + 1}: Sample item`, 'finishes', status, created, decisionMade, 'user-1');
        }
    }
    catch (e) {
        if (!String(e).includes('UNIQUE'))
            console.error('[DB] seedAnalyticsData:', e);
    }
}
function seedAdminUser() {
    const existing = db.prepare('SELECT id FROM admin_users LIMIT 1').get();
    if (existing)
        return;
    const bcrypt = require('bcryptjs');
    const crypto = require('crypto');
    const id = crypto.randomUUID();
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare("INSERT INTO admin_users (id, email, name, role, password_hash, is_active) VALUES (?, 'admin@archject.local', 'Admin', 'super-admin', ?, 1)").run(id, hash);
}
function seedKbArticles() {
    try {
        const hasArticles = db.prepare('SELECT 1 FROM kb_articles LIMIT 1').get();
        if (hasArticles)
            return;
        const crypto = require('crypto');
        const now = new Date().toISOString();
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
        ];
        const insert = db.prepare(`INSERT INTO kb_articles (id, slug, title, excerpt, body, tags, featured, published, author_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        for (const a of articles) {
            insert.run(a.id, a.slug, a.title, a.excerpt, a.body, a.tags, a.featured, a.published, null, now, now);
        }
    }
    catch (e) {
        if (!String(e).includes('UNIQUE'))
            console.error('[DB] seedKbArticles:', e);
    }
}
