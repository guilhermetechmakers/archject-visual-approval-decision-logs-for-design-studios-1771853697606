import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from './db.js';
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
function requireAuth(req, res, next) {
    const auth = req.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
        res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' });
        return;
    }
    try {
        const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
        req.userId = decoded.sub;
        next();
    }
    catch {
        res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid or expired token' });
    }
}
export const decisionsRouter = Router();
// GET /api/templates - list decision templates
decisionsRouter.get('/templates', requireAuth, (_req, res) => {
    try {
        const rows = db.prepare('SELECT id, name, description, default_options_json FROM decision_templates ORDER BY name').all();
        const templates = rows.map((r) => {
            let defaultOptions = [];
            if (r.default_options_json) {
                try {
                    defaultOptions = JSON.parse(r.default_options_json);
                }
                catch {
                    // ignore
                }
            }
            return {
                id: r.id,
                name: r.name,
                description: r.description ?? '',
                defaultOptions,
                previewAssets: [],
            };
        });
        res.json({ templates });
    }
    catch (e) {
        res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to fetch templates' });
    }
});
// GET /api/projects/:projectId/decisions - list decisions for project
decisionsRouter.get('/projects/:projectId/decisions', requireAuth, (req, res) => {
    const { projectId } = req.params;
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
    if (!project)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Project not found' });
    const rows = db.prepare('SELECT id, project_id, title, status, created_at, updated_at FROM decisions WHERE project_id = ? ORDER BY created_at DESC').all(projectId);
    const decisions = rows.map((r) => ({
        id: r.id,
        projectId: r.project_id,
        title: r.title,
        status: r.status,
        options: [],
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    }));
    res.json(decisions);
});
// POST /api/projects/:projectId/decisions - create draft decision
decisionsRouter.post('/projects/:projectId/decisions', requireAuth, (req, res) => {
    const userId = req.userId;
    const { projectId } = req.params;
    const { templateId, fromScratch, title, description, options } = req.body;
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
    if (!project)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Project not found' });
    const decisionId = crypto.randomUUID();
    const now = new Date().toISOString();
    const status = 'draft';
    let opts = options ?? [];
    if (templateId && !fromScratch) {
        const t = db.prepare('SELECT default_options_json FROM decision_templates WHERE id = ?').get(templateId);
        if (t?.default_options_json) {
            try {
                opts = JSON.parse(t.default_options_json);
            }
            catch {
                // ignore
            }
        }
    }
    db.prepare(`INSERT INTO decisions (id, project_id, account_id, title, type, status, created_at, updated_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(decisionId, projectId, userId, title ?? 'Untitled Decision', 'finishes', status, now, now, userId);
    for (let i = 0; i < opts.length; i++) {
        const o = opts[i];
        const optId = crypto.randomUUID();
        db.prepare(`INSERT INTO decision_options (id, decision_id, title, description, is_default, is_recommended, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`).run(optId, decisionId, o.title ?? `Option ${i + 1}`, o.description ?? null, o.isDefault ? 1 : 0, o.isRecommended ? 1 : 0, i);
    }
    db.prepare(`INSERT INTO decision_audit_log (id, decision_id, action, performed_by, performed_at, details)
     VALUES (?, ?, ?, ?, ?, ?)`).run(crypto.randomUUID(), decisionId, 'created', userId, now, JSON.stringify({ fromTemplate: !!templateId }));
    res.status(201).json({ decisionId, status });
});
// GET /api/projects/:projectId/decisions/:decisionId
decisionsRouter.get('/projects/:projectId/decisions/:decisionId', requireAuth, (req, res) => {
    const { projectId, decisionId } = req.params;
    const row = db.prepare('SELECT id, project_id, title, status, created_at, updated_at FROM decisions WHERE id = ? AND project_id = ?').get(decisionId, projectId);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' });
    const options = db.prepare('SELECT id, title, description, is_default, is_recommended, sort_order FROM decision_options WHERE decision_id = ? ORDER BY sort_order').all(decisionId);
    res.json({
        id: row.id,
        projectId: row.project_id,
        title: row.title,
        description: '',
        status: row.status,
        options: options.map((o) => ({
            id: o.id,
            label: o.title,
            description: o.description ?? undefined,
            isDefault: !!o.is_default,
            isRecommended: !!o.is_recommended,
        })),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    });
});
// PUT /api/projects/:projectId/decisions/:decisionId
decisionsRouter.put('/projects/:projectId/decisions/:decisionId', requireAuth, (req, res) => {
    const userId = req.userId;
    const { projectId, decisionId } = req.params;
    const { title, description, options, approvalDeadline, reminders, clientMustTypeNameToConfirm, recipients } = req.body;
    const row = db.prepare('SELECT id, status FROM decisions WHERE id = ? AND project_id = ?').get(decisionId, projectId);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' });
    if (row.status === 'published') {
        return res.status(400).json({ code: 'INVALID_STATE', message: 'Cannot edit published decision' });
    }
    const now = new Date().toISOString();
    const updates = [];
    const params = [];
    if (title !== undefined) {
        updates.push('title = ?');
        params.push(title);
    }
    if (updates.length > 0) {
        updates.push('updated_at = ?');
        params.push(now);
        params.push(decisionId);
        db.prepare(`UPDATE decisions SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }
    if (options && Array.isArray(options)) {
        const existing = db.prepare('SELECT id FROM decision_options WHERE decision_id = ?').all(decisionId);
        const existingIds = new Set(existing.map((e) => e.id));
        for (let i = 0; i < options.length; i++) {
            const o = options[i];
            if (o.id && existingIds.has(o.id)) {
                db.prepare(`UPDATE decision_options SET title = ?, description = ?, is_default = ?, is_recommended = ?, sort_order = ?, updated_at = ? WHERE id = ?`).run(o.title, o.description ?? null, o.isDefault ? 1 : 0, o.isRecommended ? 1 : 0, i, now, o.id);
            }
            else {
                const optId = crypto.randomUUID();
                db.prepare(`INSERT INTO decision_options (id, decision_id, title, description, is_default, is_recommended, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`).run(optId, decisionId, o.title, o.description ?? null, o.isDefault ? 1 : 0, o.isRecommended ? 1 : 0, i);
            }
        }
    }
    if (recipients && Array.isArray(recipients)) {
        db.prepare('DELETE FROM decision_recipients WHERE decision_id = ?').run(decisionId);
        for (const r of recipients) {
            if (r.contactEmail) {
                db.prepare('INSERT INTO decision_recipients (id, decision_id, contact_email, role) VALUES (?, ?, ?, ?)').run(crypto.randomUUID(), decisionId, r.contactEmail, r.role ?? 'client');
            }
        }
    }
    db.prepare(`INSERT INTO decision_audit_log (id, decision_id, action, performed_by, performed_at, details)
     VALUES (?, ?, ?, ?, ?, ?)`).run(crypto.randomUUID(), decisionId, 'updated', userId, now, '{}');
    res.json({ decisionId, status: 'draft' });
});
// POST /api/projects/:projectId/decisions/:decisionId/publish
decisionsRouter.post('/projects/:projectId/decisions/:decisionId/publish', requireAuth, (req, res) => {
    const userId = req.userId;
    const { projectId, decisionId } = req.params;
    const row = db.prepare('SELECT id, status, title FROM decisions WHERE id = ? AND project_id = ?').get(decisionId, projectId);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' });
    if (row.status === 'published') {
        return res.json({ decisionId, status: 'published', clientLink: `/client/mock-token-${decisionId}` });
    }
    const optCount = db.prepare('SELECT COUNT(*) as c FROM decision_options WHERE decision_id = ?').get(decisionId);
    if (optCount.c < 1) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'At least one option is required to publish' });
    }
    const now = new Date().toISOString();
    db.prepare('UPDATE decisions SET status = ?, updated_at = ? WHERE id = ?').run('pending', now, decisionId);
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHmac('sha256', process.env.HMAC_SECRET ?? 'archject-client-token-secret').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO client_tokens (id, project_id, decision_ids, scope, token_hash, expires_at) VALUES (?, ?, ?, ?, ?, ?)').run(crypto.randomUUID(), projectId, JSON.stringify([decisionId]), 'read_approve', tokenHash, expiresAt);
    db.prepare(`INSERT INTO decision_audit_log (id, decision_id, action, performed_by, performed_at, details)
     VALUES (?, ?, ?, ?, ?, ?)`).run(crypto.randomUUID(), decisionId, 'published', userId, now, JSON.stringify({ clientLink: true }));
    const baseUrl = (req.get('x-forwarded-proto') || req.protocol) + '://' + (req.get('x-forwarded-host') || req.get('host') || 'localhost:3001');
    const clientLink = `${baseUrl}/client/${token}`;
    res.json({ decisionId, status: 'published', clientLink });
});
// POST /api/projects/:projectId/decisions/:decisionId/options
decisionsRouter.post('/projects/:projectId/decisions/:decisionId/options', requireAuth, (req, res) => {
    const { projectId, decisionId } = req.params;
    const { title, description, isDefault, isRecommended } = req.body;
    const row = db.prepare('SELECT id FROM decisions WHERE id = ? AND project_id = ?').get(decisionId, projectId);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' });
    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM decision_options WHERE decision_id = ?').get(decisionId);
    const optId = crypto.randomUUID();
    db.prepare(`INSERT INTO decision_options (id, decision_id, title, description, is_default, is_recommended, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`).run(optId, decisionId, title ?? 'New option', description ?? null, isDefault ? 1 : 0, isRecommended ? 1 : 0, maxOrder.next);
    res.status(201).json({
        id: optId,
        title: title ?? 'New option',
        description: description ?? undefined,
        isDefault: !!isDefault,
        isRecommended: !!isRecommended,
    });
});
// PUT /api/projects/:projectId/decisions/:decisionId/options/:optionId
decisionsRouter.put('/projects/:projectId/decisions/:decisionId/options/:optionId', requireAuth, (req, res) => {
    const { projectId, decisionId, optionId } = req.params;
    const { title, description, isDefault, isRecommended } = req.body;
    const row = db.prepare('SELECT id FROM decision_options WHERE id = ? AND decision_id = ?').get(optionId, decisionId);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Option not found' });
    const project = db.prepare('SELECT id FROM decisions WHERE id = ? AND project_id = ?').get(decisionId, projectId);
    if (!project)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' });
    const updates = [];
    const params = [];
    if (title !== undefined) {
        updates.push('title = ?');
        params.push(title);
    }
    if (description !== undefined) {
        updates.push('description = ?');
        params.push(description);
    }
    if (isDefault !== undefined) {
        updates.push('is_default = ?');
        params.push(isDefault ? 1 : 0);
    }
    if (isRecommended !== undefined) {
        updates.push('is_recommended = ?');
        params.push(isRecommended ? 1 : 0);
    }
    if (updates.length > 0) {
        updates.push('updated_at = ?');
        params.push(new Date().toISOString());
        params.push(optionId);
        db.prepare(`UPDATE decision_options SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }
    res.json({ id: optionId, status: 'updated' });
});
