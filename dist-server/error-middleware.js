import crypto from 'crypto';
import { db } from './db.js';
function sanitize(str, maxLen) {
    if (str == null)
        return null;
    const s = String(str).trim();
    return s.length > 0 ? s.slice(0, maxLen) : null;
}
/**
 * Assign X-Request-Id (correlationId) to each request.
 */
export function requestIdMiddleware(req, _res, next) {
    const existing = req.headers['x-request-id'];
    const id = typeof existing === 'string' ? existing : crypto.randomUUID();
    req.requestId = id;
    next();
}
/**
 * Central error handler: catch unhandled exceptions, log with correlationId,
 * return standardized 500 response with incidentId.
 */
export function errorHandler(err, req, res, _next) {
    const requestId = req.requestId ?? crypto.randomUUID();
    const incidentId = crypto.randomUUID();
    console.error(`[${incidentId}] Unhandled error:`, err.message, err.stack);
    try {
        db.prepare(`INSERT INTO server_errors (
        id, correlation_id, created_at, user_id, route, method, url,
        error_message, stack_summary, client_context, tags, resolved, resolved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)`).run(incidentId, requestId, new Date().toISOString(), null, sanitize(req.path, 2048) ?? req.path, req.method, req.originalUrl, sanitize(err.message, 4096) ?? 'Unknown error', sanitize(err.stack, 3000), null, null);
    }
    catch (dbErr) {
        console.error('[ErrorMiddleware] Failed to persist error:', dbErr);
    }
    res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        incidentId,
        correlationId: requestId,
    });
}
