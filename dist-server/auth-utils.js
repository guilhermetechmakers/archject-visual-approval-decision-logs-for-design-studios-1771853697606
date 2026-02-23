import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db } from './db.js';
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const HMAC_SECRET = process.env.HMAC_SECRET ?? 'archject-verification-salt';
const REFRESH_TOKEN_DAYS = 14;
const ACCESS_TOKEN_MINUTES = 15;
const REFRESH_TOKEN_COOKIE = 'archject_refresh';
export function hashToken(token) {
    return crypto.createHmac('sha256', HMAC_SECRET).update(token).digest('hex');
}
export function createAccessToken(userId, email, sessionId) {
    const jti = crypto.randomUUID();
    const payload = {
        sub: userId,
        email,
        jti,
        ...(sessionId && { session_id: sessionId }),
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: `${ACCESS_TOKEN_MINUTES}m` });
}
export function verifyAccessToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded;
    }
    catch {
        return null;
    }
}
export function createRefreshToken() {
    return crypto.randomBytes(32).toString('hex');
}
export function setRefreshTokenCookie(res, token) {
    const maxAge = REFRESH_TOKEN_DAYS * 24 * 60 * 60;
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie(REFRESH_TOKEN_COOKIE, token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'strict',
        maxAge: maxAge * 1000,
        path: '/',
    });
}
export function clearRefreshTokenCookie(res) {
    res.clearCookie(REFRESH_TOKEN_COOKIE, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
    });
}
export function getRefreshTokenFromRequest(req) {
    return req.cookies?.[REFRESH_TOKEN_COOKIE] ?? null;
}
export function storeRefreshToken(userId, token, ip, userAgent, sessionId) {
    const id = crypto.randomUUID();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
    const hasSessionId = db.prepare("SELECT 1 FROM pragma_table_info('refresh_tokens') WHERE name='session_id'").get();
    if (hasSessionId) {
        db.prepare(`INSERT INTO refresh_tokens (id, user_id, token_hash, ip, user_agent, expires_at, session_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, userId, tokenHash, ip ?? null, userAgent ?? null, expiresAt.toISOString(), sessionId ?? null);
    }
    else {
        db.prepare(`INSERT INTO refresh_tokens (id, user_id, token_hash, ip, user_agent, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`).run(id, userId, tokenHash, ip ?? null, userAgent ?? null, expiresAt.toISOString());
    }
    return id;
}
export function validateRefreshToken(token) {
    const tokenHash = hashToken(token);
    const row = db.prepare(`SELECT id, user_id, session_id, replaced_by_id, revoked_at, expires_at
     FROM refresh_tokens WHERE token_hash = ?`).get(tokenHash);
    if (!row)
        return null;
    if (row.revoked_at)
        return null;
    if (new Date(row.expires_at) < new Date())
        return null;
    // Reuse detection: token was already rotated (replaced_by_id set)
    const hasReplacedBy = db.prepare("SELECT 1 FROM pragma_table_info('refresh_tokens') WHERE name='replaced_by_id'").get();
    if (hasReplacedBy && row.replaced_by_id) {
        return { valid: false, reuseDetected: true, userId: row.user_id };
    }
    return {
        valid: true,
        userId: row.user_id,
        sessionId: row.session_id ?? null,
    };
}
export function revokeRefreshToken(token) {
    const tokenHash = hashToken(token);
    db.prepare(`UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE token_hash = ?`).run(tokenHash);
}
export function markRefreshTokenRotated(tokenHash, replacedById) {
    const hasReplacedBy = db.prepare("SELECT 1 FROM pragma_table_info('refresh_tokens') WHERE name='replaced_by_id'").get();
    if (hasReplacedBy) {
        db.prepare(`UPDATE refresh_tokens SET replaced_by_id = ?, revoked_at = datetime('now') WHERE token_hash = ?`).run(replacedById, tokenHash);
    }
    else {
        db.prepare(`UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE token_hash = ?`).run(tokenHash);
    }
}
export function revokeAllRefreshTokensForUser(userId) {
    db.prepare(`UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL`).run(userId);
}
export function revokeRefreshTokensForSession(sessionId) {
    const hasSessionId = db.prepare("SELECT 1 FROM pragma_table_info('refresh_tokens') WHERE name='session_id'").get();
    if (hasSessionId) {
        db.prepare(`UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE session_id = ? AND revoked_at IS NULL`).run(sessionId);
    }
}
export function revokeAllSessionsForUser(userId) {
    db.prepare(`UPDATE sessions SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL`).run(userId);
}
export function createSession(userId, ip, userAgent, opts) {
    const id = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
    const hasExtras = db.prepare("SELECT 1 FROM pragma_table_info('sessions') WHERE name='device_name'").get();
    if (hasExtras) {
        db.prepare(`INSERT INTO sessions (id, user_id, ip, user_agent, device_name, platform, geo_city, geo_country, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, userId, ip ?? null, userAgent ?? null, opts?.device_name ?? null, opts?.platform ?? 'web', opts?.geo_city ?? null, opts?.geo_country ?? null, expiresAt.toISOString());
    }
    else {
        db.prepare(`INSERT INTO sessions (id, user_id, ip, user_agent) VALUES (?, ?, ?, ?)`).run(id, userId, ip ?? null, userAgent ?? null);
    }
    return id;
}
export function updateSessionLastActive(sessionId) {
    db.prepare(`UPDATE sessions SET last_active_at = datetime('now') WHERE id = ?`).run(sessionId);
}
export function updateSessionJti(sessionId, jti) {
    const hasJti = db.prepare("SELECT 1 FROM pragma_table_info('sessions') WHERE name='jti'").get();
    if (hasJti) {
        db.prepare(`UPDATE sessions SET jti = ? WHERE id = ?`).run(jti, sessionId);
    }
}
export function logSessionAudit(userId, sessionId, type, payload) {
    try {
        const hasTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='audit_events'").get();
        if (hasTable) {
            const id = crypto.randomUUID();
            db.prepare(`INSERT INTO audit_events (id, user_id, session_id, type, payload) VALUES (?, ?, ?, ?, ?)`).run(id, userId, sessionId, type, payload ? JSON.stringify(payload) : null);
        }
    }
    catch (e) {
        console.error('[Audit] logSessionAudit:', e);
    }
}
export function getUserIdFromAccessToken(req) {
    const authHeader = req.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token)
        return null;
    const payload = verifyAccessToken(token);
    return payload?.sub ?? null;
}
