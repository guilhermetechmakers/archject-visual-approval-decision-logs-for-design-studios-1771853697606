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
    const privacyPath = path.join(process.cwd(), 'server', 'migrations', '007_privacy.sql');
    if (fs.existsSync(privacyPath)) {
        try {
            const sql = fs.readFileSync(privacyPath, 'utf-8');
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
    }
    const termsPath = path.join(process.cwd(), 'server', 'migrations', '008_terms.sql');
    if (fs.existsSync(termsPath)) {
        try {
            const sql = fs.readFileSync(termsPath, 'utf-8');
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
        seedTermsVersion();
    }
    const support404Path = path.join(process.cwd(), 'server', 'migrations', '009_404_support.sql');
    if (fs.existsSync(support404Path)) {
        try {
            const sql = fs.readFileSync(support404Path, 'utf-8');
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
    }
    const serverErrorsPath = path.join(process.cwd(), 'server', 'migrations', '010_server_errors.sql');
    if (fs.existsSync(serverErrorsPath)) {
        try {
            const sql = fs.readFileSync(serverErrorsPath, 'utf-8');
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
    }
    const jobsPath = path.join(process.cwd(), 'server', 'migrations', '011_jobs.sql');
    if (fs.existsSync(jobsPath)) {
        try {
            const sql = fs.readFileSync(jobsPath, 'utf-8');
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
    }
    const exportsAuditPath = path.join(process.cwd(), 'server', 'migrations', '012_exports_audit.sql');
    if (fs.existsSync(exportsAuditPath)) {
        try {
            const sql = fs.readFileSync(exportsAuditPath, 'utf-8');
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
    }
    const authExtendedPath = path.join(process.cwd(), 'server', 'migrations', '013_auth_extended.sql');
    if (fs.existsSync(authExtendedPath)) {
        try {
            const sql = fs.readFileSync(authExtendedPath, 'utf-8');
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
        // Add role and avatar_url to users if not present
        try {
            db.exec('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "owner"');
        }
        catch (e) {
            if (!String(e).includes('duplicate column name'))
                throw e;
        }
        try {
            db.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT');
        }
        catch (e) {
            if (!String(e).includes('duplicate column name'))
                throw e;
        }
    }
    const twofaPath = path.join(process.cwd(), 'server', 'migrations', '014_twofa.sql');
    if (fs.existsSync(twofaPath)) {
        try {
            const sql = fs.readFileSync(twofaPath, 'utf-8');
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
        // Add 2FA columns to users
        for (const col of [
            '2fa_enabled INTEGER DEFAULT 0',
            '2fa_method TEXT',
            'phone_number TEXT',
            '2fa_recovery_generated_at TEXT',
        ]) {
            try {
                db.exec(`ALTER TABLE users ADD COLUMN ${col}`);
            }
            catch (e) {
                if (!String(e).includes('duplicate column name'))
                    throw e;
            }
        }
    }
    const profileStudioPath = path.join(process.cwd(), 'server', 'migrations', '015_profile_studio.sql');
    if (fs.existsSync(profileStudioPath)) {
        try {
            const sql = fs.readFileSync(profileStudioPath, 'utf-8');
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
        for (const col of ['timezone TEXT DEFAULT "UTC"', 'locale TEXT DEFAULT "en"', 'bio TEXT']) {
            try {
                db.exec(`ALTER TABLE users ADD COLUMN ${col}`);
            }
            catch (e) {
                if (!String(e).includes('duplicate column name'))
                    throw e;
            }
        }
    }
    // 016: password reset audit columns
    for (const col of [
        'request_ip TEXT',
        'request_user_agent TEXT',
    ]) {
        try {
            db.exec(`ALTER TABLE password_reset_tokens ADD COLUMN ${col}`);
        }
        catch (e) {
            if (!String(e).includes('duplicate column name'))
                throw e;
        }
    }
    try {
        db.exec('ALTER TABLE users ADD COLUMN last_password_changed_at TEXT');
    }
    catch (e) {
        if (!String(e).includes('duplicate column name'))
            throw e;
    }
    // 017: sessions security - session enhancements, audit_events, refresh token rotation
    const sessionsSecurityPath = path.join(process.cwd(), 'server', 'migrations', '017_sessions_security.sql');
    if (fs.existsSync(sessionsSecurityPath)) {
        try {
            const sql = fs.readFileSync(sessionsSecurityPath, 'utf-8');
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
    }
    // 018: leads table for demo/signup capture
    const leadsPath = path.join(process.cwd(), 'server', 'migrations', '018_leads.sql');
    if (fs.existsSync(leadsPath)) {
        try {
            const sql = fs.readFileSync(leadsPath, 'utf-8');
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
function seedTermsVersion() {
    try {
        const hasTerms = db.prepare('SELECT 1 FROM terms_versions LIMIT 1').get();
        if (hasTerms)
            return;
        const crypto = require('crypto');
        const id = crypto.randomUUID();
        const effectiveDate = new Date().toISOString().slice(0, 10);
        const changeLog = JSON.stringify([{ date: effectiveDate, note: 'Initial version' }]);
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

For questions about these Terms, contact legal@archject.com. For general support, see our Help Center.`;
        db.prepare(`INSERT INTO terms_versions (id, version_number, slug, content_markdown, effective_date, change_log, published)
       VALUES (?, ?, ?, ?, ?, ?, 1)`).run(id, 'v1.0', `terms-${effectiveDate}`, content, effectiveDate, changeLog);
    }
    catch (e) {
        if (!String(e).includes('UNIQUE'))
            console.error('[DB] seedTermsVersion:', e);
    }
}
