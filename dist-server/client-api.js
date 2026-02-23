import { Router } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db } from './db.js';
const HMAC_SECRET = process.env.HMAC_SECRET ?? 'archject-client-token-secret';
const JWT_SECRET = process.env.JWT_SECRET ?? process.env.CLIENT_TOKEN_SECRET ?? 'dev-secret';
function hashToken(token) {
    return crypto.createHmac('sha256', HMAC_SECRET).update(token).digest('hex');
}
function getTokenPayload(token) {
    const tokenHash = hashToken(token);
    const tokenRow = db.prepare(`SELECT project_id, decision_ids FROM client_tokens WHERE token_hash = ?`).get(tokenHash);
    if (tokenRow) {
        let decisionIds = [];
        try {
            decisionIds = JSON.parse(tokenRow.decision_ids);
        }
        catch {
            // ignore
        }
        return { projectId: tokenRow.project_id, decisionIds };
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return {
            projectId: decoded.projectId ?? '',
            decisionIds: decoded.decisionIds ?? [],
            exp: decoded.exp,
        };
    }
    catch {
        return null;
    }
}
function mapDecisionRow(row, decisionId) {
    let opts;
    try {
        const options = db.prepare(`SELECT id, title, description FROM decision_options WHERE decision_id = ? ORDER BY sort_order`).all(decisionId);
        opts = options.length > 0
            ? options.map((o) => ({
                id: o.id,
                label: o.title,
                description: o.description ?? undefined,
                selected: false,
            }))
            : [
                { id: 'opt1', label: 'Option A', description: 'First option', selected: false },
                { id: 'opt2', label: 'Option B', description: 'Second option', selected: false },
            ];
    }
    catch {
        opts = [
            { id: 'opt1', label: 'Option A', description: 'First option', selected: false },
            { id: 'opt2', label: 'Option B', description: 'Second option', selected: false },
        ];
    }
    let approvedOptionId;
    try {
        const parsed = row.last_confirmed_by ? JSON.parse(row.last_confirmed_by) : null;
        approvedOptionId = parsed?.optionId ?? undefined;
    }
    catch {
        // ignore
    }
    return {
        id: row.id,
        projectId: row.project_id,
        title: row.title,
        description: '',
        options: opts,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastConfirmedAt: row.last_confirmed_at ?? undefined,
        lastConfirmedBy: row.last_confirmed_by ?? undefined,
        approvedOptionId,
    };
}
export const clientRouter = Router();
// GET /client/:token/decisions - list all decisions for token (must be before /client/:token)
clientRouter.get('/client/:token/decisions', (req, res) => {
    const token = req.params.token;
    const payload = getTokenPayload(token);
    if (!payload) {
        return res.status(404).json({ code: 'INVALID_TOKEN', message: 'Invalid or expired token' });
    }
    const { projectId, decisionIds } = payload;
    const idsToFetch = decisionIds.length > 0 ? decisionIds : null;
    const rows = idsToFetch
        ? db.prepare(`SELECT d.id, d.project_id, d.title, d.status, d.created_at, d.updated_at, d.last_confirmed_at, d.last_confirmed_by
         FROM decisions d WHERE d.project_id = ? AND d.id IN (${idsToFetch.map(() => '?').join(',')})
         ORDER BY d.created_at DESC`).all(projectId, ...idsToFetch)
        : db.prepare(`SELECT d.id, d.project_id, d.title, d.status, d.created_at, d.updated_at, d.last_confirmed_at, d.last_confirmed_by
         FROM decisions d WHERE d.project_id = ?
         ORDER BY d.created_at DESC`).all(projectId);
    const decisions = rows.map((r) => mapDecisionRow(r, r.id));
    return res.json(decisions);
});
// GET /client/:token/decision/:decisionId - decision detail
clientRouter.get('/client/:token/decision/:decisionId', (req, res) => {
    const token = req.params.token;
    const decisionId = req.params.decisionId;
    const payload = getTokenPayload(token);
    if (!payload) {
        return res.status(404).json({ code: 'INVALID_TOKEN', message: 'Invalid or expired token' });
    }
    if (payload.decisionIds.length > 0 && !payload.decisionIds.includes(decisionId)) {
        return res.status(403).json({ code: 'FORBIDDEN', message: 'Access denied to this decision' });
    }
    const row = db.prepare(`SELECT d.id, d.project_id, d.title, d.status, d.created_at, d.updated_at, d.last_confirmed_at, d.last_confirmed_by
     FROM decisions d WHERE d.id = ? AND d.project_id = ?`).get(decisionId, payload.projectId);
    if (!row) {
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' });
    }
    return res.json(mapDecisionRow(row, decisionId));
});
// GET /client/:token/decision/:decisionId/comments
clientRouter.get('/client/:token/decision/:decisionId/comments', (req, res) => {
    const token = req.params.token;
    const decisionId = req.params.decisionId;
    const payload = getTokenPayload(token);
    if (!payload) {
        return res.status(404).json({ code: 'INVALID_TOKEN', message: 'Invalid or expired token' });
    }
    if (payload.decisionIds.length > 0 && !payload.decisionIds.includes(decisionId)) {
        return res.status(403).json({ code: 'FORBIDDEN', message: 'Access denied to this decision' });
    }
    let rows;
    try {
        rows = db.prepare(`SELECT id, decision_id, parent_comment_id, author_id, author_name, content, created_at
       FROM portal_comments WHERE decision_id = ? ORDER BY created_at ASC`).all(decisionId);
    }
    catch {
        return res.json([]);
    }
    const comments = rows.map((r) => ({
        id: r.id,
        decisionId: r.decision_id,
        parentCommentId: r.parent_comment_id,
        authorId: r.author_id,
        authorName: r.author_name ?? 'Unknown',
        content: r.content,
        createdAt: r.created_at,
        attachments: [],
    }));
    return res.json(comments);
});
// POST /client/:token/decision/:decisionId/comment
clientRouter.post('/client/:token/decision/:decisionId/comment', (req, res) => {
    const token = req.params.token;
    const decisionId = req.params.decisionId;
    const { content, parentCommentId } = req.body;
    const payload = getTokenPayload(token);
    if (!payload) {
        return res.status(404).json({ code: 'INVALID_TOKEN', message: 'Invalid or expired token' });
    }
    if (payload.decisionIds.length > 0 && !payload.decisionIds.includes(decisionId)) {
        return res.status(403).json({ code: 'FORBIDDEN', message: 'Access denied to this decision' });
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Comment content is required' });
    }
    const decision = db.prepare('SELECT id FROM decisions WHERE id = ? AND project_id = ?').get(decisionId, payload.projectId);
    if (!decision) {
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' });
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    try {
        db.prepare(`INSERT INTO portal_comments (id, decision_id, parent_comment_id, author_id, author_name, content, created_at, client_token_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, decisionId, parentCommentId ?? null, 'client', 'Client', content.trim(), now, token.slice(0, 20));
    }
    catch (e) {
        return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to save comment' });
    }
    return res.status(201).json({
        id,
        decisionId,
        parentCommentId: parentCommentId ?? null,
        authorId: 'client',
        authorName: 'Client',
        content: content.trim(),
        createdAt: now,
        attachments: [],
    });
});
// POST /client/:token/decision/:decisionId/export
clientRouter.post('/client/:token/decision/:decisionId/export', (req, res) => {
    const token = req.params.token;
    const decisionId = req.params.decisionId;
    const payload = getTokenPayload(token);
    if (!payload) {
        return res.status(404).json({ code: 'INVALID_TOKEN', message: 'Invalid or expired token' });
    }
    if (payload.decisionIds.length > 0 && !payload.decisionIds.includes(decisionId)) {
        return res.status(403).json({ code: 'FORBIDDEN', message: 'Access denied to this decision' });
    }
    const baseUrl = (req.get('x-forwarded-proto') || req.protocol) + '://' + (req.get('x-forwarded-host') || req.get('host') || 'localhost:3001');
    return res.json({
        url: `${baseUrl}/api/v1/client/receipt/download?token=${encodeURIComponent(token)}&decisionId=${decisionId}`,
        jobId: null,
    });
});
// POST /client/:token/decision/:decisionId/followup
clientRouter.post('/client/:token/decision/:decisionId/followup', (req, res) => {
    const token = req.params.token;
    const decisionId = req.params.decisionId;
    const { title } = req.body;
    const payload = getTokenPayload(token);
    if (!payload) {
        return res.status(404).json({ code: 'INVALID_TOKEN', message: 'Invalid or expired token' });
    }
    if (payload.decisionIds.length > 0 && !payload.decisionIds.includes(decisionId)) {
        return res.status(403).json({ code: 'FORBIDDEN', message: 'Access denied to this decision' });
    }
    const id = crypto.randomUUID();
    return res.status(201).json({ id });
});
// GET /client/:token/notifications
clientRouter.get('/client/:token/notifications', (req, res) => {
    const token = req.params.token;
    const payload = getTokenPayload(token);
    if (!payload) {
        return res.status(404).json({ code: 'INVALID_TOKEN', message: 'Invalid or expired token' });
    }
    return res.json([]);
});
// GET /client/:token/token/status
clientRouter.get('/client/:token/token/status', (req, res) => {
    const token = req.params.token;
    const payload = getTokenPayload(token);
    if (!payload) {
        return res.status(401).json({
            valid: false,
            message: 'Invalid or expired token',
            projectId: '',
            allowedDecisionIds: [],
        });
    }
    const expiresAt = payload.exp ? new Date(payload.exp * 1000).toISOString() : undefined;
    return res.json({
        valid: true,
        expiresAt,
        projectId: payload.projectId,
        allowedDecisionIds: payload.decisionIds,
    });
});
// GET /client/:token/branding
clientRouter.get('/client/:token/branding', (req, res) => {
    const token = req.params.token;
    const payload = getTokenPayload(token);
    if (!payload) {
        return res.status(404).json({ code: 'INVALID_TOKEN', message: 'Invalid or expired token' });
    }
    const project = db.prepare(`SELECT p.id, p.studio_id, s.branding_logo_url, s.branding_invoice_accent_color
     FROM projects p
     LEFT JOIN studios s ON s.id = p.studio_id
     WHERE p.id = ?`).get(payload.projectId);
    if (!project) {
        return res.json({
            logoUrl: null,
            primaryColor: '#0052CC',
            secondaryColor: '#FFFFFF',
            backgroundColor: '#F7F7F9',
        });
    }
    const studio = project.studio_id
        ? db.prepare('SELECT branding_logo_url, branding_invoice_accent_color FROM studios WHERE id = ?').get(project.studio_id)
        : null;
    return res.json({
        logoUrl: studio?.branding_logo_url ?? project.branding_logo_url ?? null,
        primaryColor: studio?.branding_invoice_accent_color ?? project.branding_invoice_accent_color ?? '#0052CC',
        secondaryColor: '#FFFFFF',
        backgroundColor: '#F7F7F9',
    });
});
// GET /client/:token - returns decision for client portal (legacy, first in list)
clientRouter.get('/client/:token', (req, res) => {
    const token = req.params.token;
    const payload = getTokenPayload(token);
    if (!payload) {
        return res.status(404).json({
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token',
        });
    }
    const { decisionIds } = payload;
    const decisionId = decisionIds[0];
    if (!decisionId) {
        return res.status(404).json({
            code: 'NOT_FOUND',
            message: 'No decision found for this token',
        });
    }
    const row = db.prepare(`SELECT d.id, d.project_id, d.title, d.status, d.created_at, d.updated_at, d.last_confirmed_at, d.last_confirmed_by
     FROM decisions d WHERE d.id = ? AND d.project_id = ?`).get(decisionId, payload.projectId);
    if (!row) {
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' });
    }
    return res.json(mapDecisionRow(row, decisionId));
});
clientRouter.get('/client/confirmation', (req, res) => {
    const token = req.query.token;
    if (!token) {
        return res.status(400).json({
            code: 'MISSING_TOKEN',
            message: 'Token is required',
        });
    }
    const payload = getTokenPayload(token);
    if (!payload) {
        return res.status(404).json({
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token',
        });
    }
    const { decisionIds } = payload;
    const decisionId = decisionIds[0];
    if (!decisionId) {
        return res.status(404).json({
            code: 'NOT_FOUND',
            message: 'No decision found for this token',
        });
    }
    const decision = db.prepare(`SELECT d.id, d.title, d.last_confirmed_at, d.last_confirmed_by,
            p.name as project_name
     FROM decisions d
     JOIN projects p ON p.id = d.project_id
     WHERE d.id = ? AND d.project_id = ?`).get(decisionId, payload.projectId);
    if (!decision) {
        return res.status(404).json({
            code: 'NOT_FOUND',
            message: 'Decision not found',
        });
    }
    let lastConfirmedBy = null;
    try {
        lastConfirmedBy = decision.last_confirmed_by
            ? JSON.parse(decision.last_confirmed_by)
            : null;
    }
    catch {
        // ignore
    }
    res.json({
        decisionId: decision.id,
        projectId: payload.projectId,
        projectTitle: decision.project_name,
        decisionTitle: decision.title,
        approvedByName: lastConfirmedBy?.clientName ?? lastConfirmedBy?.userId ?? null,
        timestamp: decision.last_confirmed_at ?? new Date().toISOString(),
        options: [],
    });
});
clientRouter.get('/client/receipt', (req, res) => {
    const token = req.query.token;
    const decisionId = req.query.decisionId;
    if (!token || !decisionId) {
        return res.status(400).json({
            code: 'VALIDATION_ERROR',
            message: 'Token and decisionId are required',
        });
    }
    const payload = getTokenPayload(token);
    if (!payload) {
        return res.status(404).json({
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token',
        });
    }
    if (!payload.decisionIds.includes(decisionId)) {
        return res.status(403).json({
            code: 'FORBIDDEN',
            message: 'Access denied to this decision',
        });
    }
    const baseUrl = (req.get('x-forwarded-proto') || req.protocol) + '://' + (req.get('x-forwarded-host') || req.get('host') || 'localhost:3001');
    res.json({
        url: `${baseUrl}/api/v1/client/receipt/download?token=${encodeURIComponent(token)}&decisionId=${decisionId}`,
    });
});
clientRouter.get('/client/receipt/download', (req, res) => {
    const token = req.query.token;
    const decisionId = req.query.decisionId;
    if (!token || !decisionId) {
        return res.status(400).send('Invalid request');
    }
    const payload = getTokenPayload(token);
    if (!payload) {
        return res.status(404).send('Invalid or expired token');
    }
    if (!payload.decisionIds.includes(decisionId)) {
        return res.status(403).send('Access denied');
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="approval-receipt-${decisionId.slice(0, 8)}.pdf"`);
    res.send(Buffer.from('%PDF-1.4 placeholder - approval receipt PDF'));
});
