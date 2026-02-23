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
export function createAccessToken(userId, email) {
    return jwt.sign({ sub: userId, email }, JWT_SECRET, { expiresIn: `${ACCESS_TOKEN_MINUTES}m` });
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
export function storeRefreshToken(userId, token, ip, userAgent) {
    const id = crypto.randomUUID();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
    db.prepare(`INSERT INTO refresh_tokens (id, user_id, token_hash, ip, user_agent, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`).run(id, userId, tokenHash, ip ?? null, userAgent ?? null, expiresAt.toISOString());
    return id;
}
export function validateRefreshToken(token) {
    const tokenHash = hashToken(token);
    const row = db.prepare(`SELECT id, user_id FROM refresh_tokens
     WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > datetime('now')`).get(tokenHash);
    if (!row)
        return null;
    return { userId: row.user_id };
}
export function revokeRefreshToken(token) {
    const tokenHash = hashToken(token);
    db.prepare(`UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE token_hash = ?`).run(tokenHash);
}
export function revokeAllRefreshTokensForUser(userId) {
    db.prepare(`UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL`).run(userId);
}
export function revokeAllSessionsForUser(userId) {
    db.prepare(`UPDATE sessions SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL`).run(userId);
}
export function createSession(userId, ip, userAgent) {
    const id = crypto.randomUUID();
    db.prepare(`INSERT INTO sessions (id, user_id, ip, user_agent) VALUES (?, ?, ?, ?)`).run(id, userId, ip ?? null, userAgent ?? null);
    return id;
}
export function updateSessionLastActive(sessionId) {
    db.prepare(`UPDATE sessions SET last_active_at = datetime('now') WHERE id = ?`).run(sessionId);
}
export function getUserIdFromAccessToken(req) {
    const authHeader = req.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token)
        return null;
    const payload = verifyAccessToken(token);
    return payload?.sub ?? null;
}
