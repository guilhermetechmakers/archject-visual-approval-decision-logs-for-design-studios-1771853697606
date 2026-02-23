import { Router } from 'express';
import crypto from 'crypto';
import { db } from './db.js';
const supportReportRouter = Router();
/** Sanitize string for storage */
function sanitize(str, maxLen) {
    if (str == null)
        return null;
    const s = String(str).trim();
    return s.length > 0 ? s.slice(0, maxLen) : null;
}
/** Extract user ID from Bearer token (JWT payload.sub) */
function getUserIdFromAuth(req) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer '))
        return null;
    try {
        const token = auth.slice(7);
        const parts = token.split('.');
        if (parts.length !== 3)
            return null;
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
        return payload.sub ?? null;
    }
    catch {
        return null;
    }
}
/**
 * POST /api/support/report
 * Payload: { email?, message?, attemptedPath, userAgent, userId?, attachments? }
 * - Authenticated: userId from token; email optional
 * - Unauthenticated: email required
 */
supportReportRouter.post('/support/report', (req, res) => {
    try {
        const { email, message, attemptedPath, userAgent, userId: bodyUserId, attachments } = req.body;
        const attemptedPathVal = sanitize(attemptedPath, 2048);
        if (!attemptedPathVal) {
            return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'attemptedPath is required' });
        }
        const authUserId = getUserIdFromAuth(req);
        const userId = authUserId ?? sanitize(bodyUserId, 128);
        const emailVal = sanitize(email, 255);
        const msg = sanitize(message, 5000);
        const ua = sanitize(userAgent, 1024) ?? req.headers['user-agent'] ?? '';
        const att = Array.isArray(attachments) ? JSON.stringify(attachments).slice(0, 4096) : null;
        if (!userId && !emailVal) {
            return res.status(400).json({
                code: 'VALIDATION_ERROR',
                message: 'Please provide an email address so we can follow up on your report.',
            });
        }
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        db.prepare(`INSERT INTO support_reports (id, user_id, email, attempted_path, message, user_agent, attachments, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?)`).run(id, userId, emailVal, attemptedPathVal, msg, ua, att, now);
        res.status(200).json({ ok: true, ticketId: id });
    }
    catch (e) {
        console.error('[Support] POST /support/report:', e);
        res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to submit report' });
    }
});
export { supportReportRouter };
