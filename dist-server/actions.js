import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from './db.js';
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const CLIENT_TOKEN_SECRET = process.env.CLIENT_TOKEN_SECRET ?? JWT_SECRET;
const HMAC_SECRET = process.env.HMAC_SECRET ?? 'archject-client-token-secret';
function optionalAuth(req) {
    const auth = req.get('Authorization');
    if (!auth?.startsWith('Bearer '))
        return null;
    try {
        const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
        return decoded.sub;
    }
    catch {
        return null;
    }
}
function validateClientToken(token) {
    const tokenHash = crypto.createHmac('sha256', HMAC_SECRET).update(token).digest('hex');
    const tokenRow = db.prepare(`SELECT id, project_id, decision_ids, expires_at, revoked FROM client_tokens WHERE token_hash = ?`).get(tokenHash);
    if (tokenRow) {
        if (tokenRow.revoked)
            return null;
        const expiresAt = tokenRow.expires_at ? new Date(tokenRow.expires_at).getTime() : 0;
        if (expiresAt > 0 && expiresAt < Date.now())
            return null;
        let decisionIds = [];
        try {
            decisionIds = JSON.parse(tokenRow.decision_ids);
        }
        catch {
            // ignore
        }
        return { projectId: tokenRow.project_id, decisionIds, tokenId: tokenRow.id };
    }
    try {
        const decoded = jwt.verify(token, CLIENT_TOKEN_SECRET);
        if (decoded.exp && decoded.exp * 1000 < Date.now())
            return null;
        return {
            projectId: decoded.projectId ?? '',
            decisionIds: decoded.decisionIds ?? [],
        };
    }
    catch {
        return null;
    }
}
function recordApprovalAnalytics(tokenId, decisionId, req) {
    try {
        const id = crypto.randomUUID();
        const ipHash = req?.ip ? crypto.createHash('sha256').update(req.ip).digest('hex').slice(0, 16) : null;
        const userAgent = (req?.get?.('user-agent') ?? '').slice(0, 500) || null;
        const locale = req?.get?.('accept-language')?.split(',')[0]?.trim()?.slice(0, 32) || null;
        db.prepare(`INSERT INTO portal_analytics (id, token_id, event_type, decision_id, ip_hash, user_agent, locale)
       VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, tokenId, 'approve', decisionId, ipHash, userAgent, locale);
        db.prepare('UPDATE client_tokens SET last_used_at = ? WHERE id = ?').run(new Date().toISOString(), tokenId);
    }
    catch {
        // analytics is non-critical
    }
}
export const actionsRouter = Router();
actionsRouter.post('/actions/:actionId/confirm', (req, res) => {
    const { actionId } = req.params;
    const { source = 'internal', token, exportOptions, approverName, optionId } = req.body;
    const decision = db.prepare('SELECT id, project_id FROM decisions WHERE id = ?').get(actionId);
    if (!decision) {
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' });
    }
    let userId = null;
    let confirmedContext = 'internal';
    let lastConfirmedBy;
    if (source === 'client_token') {
        if (!token) {
            return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Token required for client_token source' });
        }
        const validated = validateClientToken(token);
        if (!validated) {
            return res.status(401).json({ code: 'INVALID_TOKEN', message: 'Invalid or expired token' });
        }
        if (decision.project_id !== validated.projectId) {
            return res.status(403).json({ code: 'FORBIDDEN', message: 'Token not valid for this decision' });
        }
        if (validated.decisionIds.length > 0 && !validated.decisionIds.includes(actionId)) {
            return res.status(403).json({ code: 'FORBIDDEN', message: 'Token not allowed for this decision' });
        }
        confirmedContext = 'client_token';
        lastConfirmedBy = JSON.stringify({
            clientTokenId: token.slice(0, 12) + '...',
            clientName: approverName ?? null,
            optionId: optionId ?? null,
        });
        if (validated.tokenId) {
            recordApprovalAnalytics(validated.tokenId, actionId, req);
        }
    }
    else {
        userId = optionalAuth(req);
        if (!userId) {
            return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' });
        }
        lastConfirmedBy = JSON.stringify({ userId, clientName: null, optionId: optionId ?? null });
    }
    const referenceId = `conf-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    try {
        db.prepare(`UPDATE decisions SET
        status = 'approved',
        last_confirmed_at = ?,
        last_confirmed_by = ?,
        confirmation_reference_id = ?,
        confirmed_context = ?,
        decision_made_at = ?,
        reviewer_id = ?,
        approved_option_id = ?
      WHERE id = ?`).run(now, lastConfirmedBy, referenceId, confirmedContext, now, userId ?? null, optionId ?? null, actionId);
    }
    catch (e) {
        if (String(e).includes('no such column')) {
            db.prepare(`UPDATE decisions SET
          status = 'approved',
          last_confirmed_at = ?,
          last_confirmed_by = ?,
          confirmation_reference_id = ?,
          confirmed_context = ?,
          decision_made_at = ?,
          reviewer_id = ?
        WHERE id = ?`).run(now, lastConfirmedBy, referenceId, confirmedContext, now, userId ?? null, actionId);
        }
        else {
            throw e;
        }
    }
    const auditId = crypto.randomUUID();
    db.prepare(`INSERT INTO audit_log (id, project_id, actor_type, actor_id, client_token_id, action_type, reference_id, payload, immutable)
     VALUES (?, ?, ?, ?, ?, 'decision_approved', ?, ?, 1)`).run(auditId, decision.project_id, confirmedContext === 'client_token' ? 'client_token' : 'user', userId ?? null, confirmedContext === 'client_token' ? token?.slice(0, 20) : null, referenceId, JSON.stringify({ decisionId: actionId, optionId: optionId ?? null }));
    let exportJobId;
    if (exportOptions?.types?.length) {
        const jobId = crypto.randomUUID();
        db.prepare(`INSERT INTO jobs (id, project_id, user_id, type, payload, status, cancellable, created_at, updated_at)
       VALUES (?, ?, ?, 'EXPORT_PDF', ?, 'QUEUED', 1, ?, ?)`).run(jobId, decision.project_id, userId ?? null, JSON.stringify({
            decisionIds: [actionId],
            types: exportOptions.types,
            includeAssets: exportOptions.includeAssets,
            branding: exportOptions.branding,
        }), now, now);
        exportJobId = jobId;
    }
    res.status(200).json({
        referenceId,
        timestamp: now,
        projectId: decision.project_id,
        exportJobId,
    });
});
