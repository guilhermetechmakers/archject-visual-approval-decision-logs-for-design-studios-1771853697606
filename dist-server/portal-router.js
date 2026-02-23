import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from './db.js';
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const HMAC_SECRET = process.env.HMAC_SECRET ?? 'archject-client-token-secret';
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
export const portalRouter = Router();
/** POST /api/portal/token/generate - create tokenized client link */
portalRouter.post('/portal/token/generate', requireAuth, (req, res) => {
    const userId = req.userId;
    const { project_id, decision_ids, allowed_actions, expires_in_minutes, client_identity_hint } = req.body;
    if (!project_id || !Array.isArray(decision_ids) || decision_ids.length === 0) {
        return res.status(400).json({
            code: 'VALIDATION_ERROR',
            message: 'project_id and decision_ids (non-empty array) are required',
        });
    }
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(project_id);
    if (!project) {
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Project not found' });
    }
    const expiresInMs = Math.min((expires_in_minutes ?? 10080) * 60 * 1000, // default 7 days
    365 * 24 * 60 * 60 * 1000);
    const expiresAt = new Date(Date.now() + expiresInMs).toISOString();
    const tokenPlain = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHmac('sha256', HMAC_SECRET).update(tokenPlain).digest('hex');
    const tokenId = crypto.randomUUID();
    const actions = allowed_actions ?? ['view', 'comment', 'approve', 'export'];
    try {
        db.prepare(`INSERT INTO client_tokens (id, project_id, decision_ids, scope, token_hash, expires_at, revoked, allowed_actions, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`).run(tokenId, project_id, JSON.stringify(decision_ids), 'read_approve', tokenHash, expiresAt, JSON.stringify(actions), userId);
    }
    catch (e) {
        if (String(e).includes('no such column')) {
            db.prepare(`INSERT INTO client_tokens (id, project_id, decision_ids, scope, token_hash, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`).run(tokenId, project_id, JSON.stringify(decision_ids), 'read_approve', tokenHash, expiresAt);
        }
        else {
            throw e;
        }
    }
    const baseUrl = (req.get('x-forwarded-proto') || req.protocol) + '://' + (req.get('x-forwarded-host') || req.get('host') || 'localhost:3001');
    const clientLink = `${baseUrl}/client/${tokenPlain}`;
    res.status(201).json({
        token_id: tokenId,
        token: tokenPlain,
        clientLink,
        expires_at: expiresAt,
        decision_ids,
        allowed_actions: actions,
    });
});
/** GET /api/portal/projects/:projectId/links - list client links for project */
portalRouter.get('/portal/projects/:projectId/links', requireAuth, (req, res) => {
    const { projectId } = req.params;
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
    if (!project) {
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Project not found' });
    }
    let rows;
    try {
        rows = db.prepare(`SELECT id, project_id, decision_ids, scope, expires_at, created_at, revoked, last_used_at, client_identity_hint
       FROM client_tokens WHERE project_id = ? ORDER BY created_at DESC`).all(projectId);
    }
    catch {
        rows = db.prepare(`SELECT id, project_id, decision_ids, scope, expires_at, created_at
       FROM client_tokens WHERE project_id = ? ORDER BY created_at DESC`).all(projectId);
    }
    let allStats = [];
    try {
        if (rows.length > 0) {
            allStats = db.prepare(`SELECT token_id, event_type, COUNT(*) as cnt FROM portal_analytics WHERE token_id IN (${rows.map(() => '?').join(',')}) GROUP BY token_id, event_type`).all(...rows.map((r) => r.id));
        }
    }
    catch {
        // portal_analytics may not exist yet
    }
    const links = rows.map((r) => {
        let decisionIds = [];
        try {
            decisionIds = JSON.parse(r.decision_ids);
        }
        catch {
            // ignore
        }
        const tokenStats = allStats.filter((s) => s.token_id === r.id);
        const views = tokenStats.find((s) => s.event_type === 'view')?.cnt ?? 0;
        const comments = tokenStats.find((s) => s.event_type === 'comment')?.cnt ?? 0;
        const approvals = tokenStats.find((s) => s.event_type === 'approve')?.cnt ?? 0;
        const exports = tokenStats.find((s) => s.event_type === 'export')?.cnt ?? 0;
        return {
            token_id: r.id,
            project_id: r.project_id,
            decision_ids: decisionIds,
            scope: r.scope,
            expires_at: r.expires_at,
            created_at: r.created_at,
            revoked: !!(r.revoked ?? 0),
            last_used_at: r.last_used_at ?? null,
            client_identity_hint: r.client_identity_hint ?? null,
            usage_stats: { views, comments, approvals, exports },
        };
    });
    res.json({ links });
});
/** GET /api/portal/link/:tokenId - token metadata and usage */
portalRouter.get('/portal/link/:tokenId', requireAuth, (req, res) => {
    const { tokenId } = req.params;
    let row;
    try {
        row = db.prepare(`SELECT id, project_id, decision_ids, scope, expires_at, created_at, revoked, last_used_at, client_identity_hint
       FROM client_tokens WHERE id = ?`).get(tokenId);
    }
    catch {
        row = db.prepare(`SELECT id, project_id, decision_ids, scope, expires_at, created_at
       FROM client_tokens WHERE id = ?`).get(tokenId);
    }
    if (!row) {
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Link not found' });
    }
    let decisionIds = [];
    try {
        decisionIds = JSON.parse(row.decision_ids);
    }
    catch {
        // ignore
    }
    let stats = [];
    let lastEvent;
    try {
        stats = db.prepare(`SELECT event_type, COUNT(*) as cnt FROM portal_analytics WHERE token_id = ? GROUP BY event_type`).all(tokenId);
        lastEvent = db.prepare(`SELECT created_at FROM portal_analytics WHERE token_id = ? ORDER BY created_at DESC LIMIT 1`).get(tokenId);
    }
    catch {
        // portal_analytics may not exist
    }
    const usageStats = {
        views: stats.find((s) => s.event_type === 'view')?.cnt ?? 0,
        comments: stats.find((s) => s.event_type === 'comment')?.cnt ?? 0,
        approvals: stats.find((s) => s.event_type === 'approve')?.cnt ?? 0,
        exports: stats.find((s) => s.event_type === 'export')?.cnt ?? 0,
    };
    res.json({
        token_id: row.id,
        project_id: row.project_id,
        decision_ids: decisionIds,
        expires_at: row.expires_at,
        revoked: !!(row.revoked ?? 0),
        last_used_at: row.last_used_at ?? lastEvent?.created_at ?? null,
        client_identity_hint: row.client_identity_hint ?? null,
        usage_stats: usageStats,
    });
});
/** POST /api/portal/link/:tokenId/revoke */
portalRouter.post('/portal/link/:tokenId/revoke', requireAuth, (req, res) => {
    const { tokenId } = req.params;
    const row = db.prepare('SELECT id FROM client_tokens WHERE id = ?').get(tokenId);
    if (!row) {
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Link not found' });
    }
    try {
        db.prepare('UPDATE client_tokens SET revoked = 1 WHERE id = ?').run(tokenId);
    }
    catch (e) {
        if (String(e).includes('no such column')) {
            return res.status(400).json({ code: 'NOT_SUPPORTED', message: 'Revocation not supported on this server version' });
        }
        throw e;
    }
    res.json({ revoked: true });
});
/** GET /api/portal/analytics/:tokenId */
portalRouter.get('/portal/analytics/:tokenId', requireAuth, (req, res) => {
    const { tokenId } = req.params;
    const row = db.prepare('SELECT id FROM client_tokens WHERE id = ?').get(tokenId);
    if (!row) {
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Link not found' });
    }
    let stats = [];
    let lastEvent;
    try {
        stats = db.prepare(`SELECT event_type, COUNT(*) as cnt FROM portal_analytics WHERE token_id = ? GROUP BY event_type`).all(tokenId);
        lastEvent = db.prepare(`SELECT created_at FROM portal_analytics WHERE token_id = ? ORDER BY created_at DESC LIMIT 1`).get(tokenId);
    }
    catch {
        // portal_analytics may not exist
    }
    res.json({
        views: stats.find((s) => s.event_type === 'view')?.cnt ?? 0,
        comments: stats.find((s) => s.event_type === 'comment')?.cnt ?? 0,
        approvals: stats.find((s) => s.event_type === 'approve')?.cnt ?? 0,
        exports: stats.find((s) => s.event_type === 'export')?.cnt ?? 0,
        last_seen_at: lastEvent?.created_at ?? null,
    });
});
