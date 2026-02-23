import { Router } from 'express';
import crypto from 'crypto';
import { db } from './db.js';
const logsRouter = Router();
/** Sanitize string for storage (max length, trim) */
function sanitize(str, maxLen) {
    if (str == null)
        return null;
    const s = String(str).trim();
    return s.length > 0 ? s.slice(0, maxLen) : null;
}
/**
 * POST /api/logs/error
 * Payload: { level, type, message, attemptedPath, referrer?, userId?, sessionId?, timestamp?, correlationId?, meta? }
 */
logsRouter.post('/logs/error', (req, res) => {
    try {
        const { level, type, message, attemptedPath, referrer, userId, sessionId, timestamp, correlationId, meta } = req.body;
        const levelVal = ['error', 'warning', 'info'].includes(level) ? level : 'error';
        const typeVal = sanitize(type, 64) ?? 'unknown';
        const msg = sanitize(message, 2048);
        const pathVal = sanitize(attemptedPath, 2048) ?? '';
        const ref = sanitize(referrer, 2048);
        const uid = sanitize(userId, 128);
        const sid = sanitize(sessionId, 128);
        const cid = sanitize(correlationId, 128);
        const metaStr = meta != null && typeof meta === 'object' ? JSON.stringify(meta).slice(0, 4096) : null;
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        db.prepare(`INSERT INTO error_logs (id, level, type, message, attempted_path, referrer, user_id, session_id, correlation_id, meta, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, levelVal, typeVal, msg, pathVal, ref, uid, sid, cid, metaStr, timestamp ?? now);
        res.status(200).json({ ok: true, id });
    }
    catch (e) {
        console.error('[Logs] POST /logs/error:', e);
        res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to log error' });
    }
});
export { logsRouter };
