import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { getUserIdFromAccessToken } from './auth-utils.js';
import { get2faStatus, maskPhone, regenerateRecoveryCodes, verify2faForUser, verifyRecoveryCode, } from './twofa.js';
export const usersRouter = Router();
function requireAuth(req, res, next) {
    const userId = getUserIdFromAccessToken(req);
    if (!userId) {
        res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' });
        return;
    }
    ;
    req.userId = userId;
    next();
}
usersRouter.get('/me', requireAuth, (req, res) => {
    try {
        const userId = req.userId;
        const user = db.prepare('SELECT id, first_name, last_name, email, email_verified, company, role, avatar_url, 2fa_enabled, 2fa_method, phone_number FROM users WHERE id = ?').get(userId);
        if (!user) {
            return res.status(404).json({ code: 'USER_NOT_FOUND', message: 'User not found' });
        }
        const oauthAccounts = db.prepare('SELECT provider, provider_email, created_at, last_used_at FROM oauth_accounts WHERE user_id = ?').all(userId);
        const twofaEnabled = user['2fa_enabled'] === 1;
        const twofaMethod = user['2fa_method'] ?? null;
        const phoneMasked = user.phone_number ? maskPhone(user.phone_number) : null;
        const sessions = db.prepare(`SELECT id, ip, user_agent, last_active_at, created_at
       FROM sessions WHERE user_id = ? AND revoked_at IS NULL ORDER BY last_active_at DESC`).all(userId);
        return res.json({
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            email_verified: Boolean(user.email_verified),
            company: user.company,
            role: user.role ?? 'owner',
            avatar_url: user.avatar_url,
            connected_providers: oauthAccounts.map((o) => ({
                provider: o.provider,
                email: o.provider_email,
                connected_at: o.created_at,
                last_used: o.last_used_at,
            })),
            two_fa_enabled: twofaEnabled,
            two_fa_method: twofaMethod,
            phone_masked: phoneMasked,
            sessions: sessions.map((s) => ({
                id: s.id,
                ip: s.ip,
                user_agent: s.user_agent,
                last_active_at: s.last_active_at,
                created_at: s.created_at,
            })),
        });
    }
    catch (err) {
        console.error('[Users] Get me error:', err);
        return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
});
usersRouter.patch('/me', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const { first_name, last_name, company } = req.body;
        const updates = [];
        const values = [];
        if (typeof first_name === 'string' && first_name.length <= 100) {
            updates.push('first_name = ?');
            values.push(first_name);
        }
        if (typeof last_name === 'string' && last_name.length <= 100) {
            updates.push('last_name = ?');
            values.push(last_name);
        }
        if (company !== undefined) {
            updates.push('company = ?');
            values.push(typeof company === 'string' ? company : null);
        }
        if (updates.length === 0) {
            return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'No valid fields to update' });
        }
        updates.push('updated_at = datetime("now")');
        values.push(userId);
        db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
        const user = db.prepare('SELECT id, first_name, last_name, email, email_verified, company, role FROM users WHERE id = ?').get(userId);
        return res.json({
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            email_verified: Boolean(user.email_verified),
            company: user.company,
            role: user.role ?? 'owner',
        });
    }
    catch (err) {
        console.error('[Users] Patch me error:', err);
        return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
});
usersRouter.post('/me/password', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                code: 'VALIDATION_ERROR',
                message: 'Current password and new password are required',
            });
        }
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                code: 'VALIDATION_ERROR',
                message: 'New password must be at least 10 characters with uppercase, lowercase, digit, and special character',
            });
        }
        const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId);
        if (!user || !user.password_hash) {
            return res.status(400).json({
                code: 'NO_PASSWORD',
                message: 'This account uses OAuth sign-in. Set a password first.',
            });
        }
        const valid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!valid) {
            return res.status(401).json({ code: 'INVALID_PASSWORD', message: 'Current password is incorrect' });
        }
        const passwordHash = await bcrypt.hash(newPassword, 10);
        db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?').run(passwordHash, userId);
        return res.json({ message: 'Password updated successfully' });
    }
    catch (err) {
        console.error('[Users] Password change error:', err);
        return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
});
usersRouter.get('/me/sessions', requireAuth, (req, res) => {
    try {
        const userId = req.userId;
        const sessions = db.prepare(`SELECT id, ip, user_agent, last_active_at, created_at
       FROM sessions WHERE user_id = ? AND revoked_at IS NULL ORDER BY last_active_at DESC`).all(userId);
        return res.json({
            sessions: sessions.map((s) => ({
                id: s.id,
                ip: s.ip,
                user_agent: s.user_agent,
                last_active_at: s.last_active_at,
                created_at: s.created_at,
            })),
        });
    }
    catch (err) {
        console.error('[Users] Get sessions error:', err);
        return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
});
usersRouter.post('/me/sessions/:id/revoke', requireAuth, (req, res) => {
    try {
        const userId = req.userId;
        const sessionId = req.params.id;
        const session = db.prepare('SELECT id FROM sessions WHERE id = ? AND user_id = ?').get(sessionId, userId);
        if (!session) {
            return res.status(404).json({ code: 'SESSION_NOT_FOUND', message: 'Session not found' });
        }
        db.prepare('UPDATE sessions SET revoked_at = datetime("now") WHERE id = ?').run(sessionId);
        return res.json({ message: 'Session revoked' });
    }
    catch (err) {
        console.error('[Users] Revoke session error:', err);
        return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
});
usersRouter.get('/me/2fa/status', requireAuth, (req, res) => {
    try {
        const userId = req.userId;
        const status = get2faStatus(userId);
        return res.json({
            enabled: status.enabled,
            method: status.method,
            phone_masked: status.phoneMasked,
            last_enforced_by_admin: status.lastEnforcedByAdmin,
        });
    }
    catch (err) {
        console.error('[Users] 2FA status error:', err);
        return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
});
usersRouter.post('/me/2fa/recovery/regenerate', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const { password, code } = req.body;
        if (!password || !code) {
            return res.status(400).json({
                code: 'VALIDATION_ERROR',
                message: 'password and code are required',
            });
        }
        const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId);
        if (!user?.password_hash) {
            return res.status(400).json({ code: 'NO_PASSWORD', message: 'Account has no password' });
        }
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ code: 'INVALID_PASSWORD', message: 'Invalid password' });
        }
        const verified = (await verify2faForUser(userId, code, 'totp')) ||
            (await verify2faForUser(userId, code, 'sms')) ||
            (await verifyRecoveryCode(userId, code));
        if (!verified) {
            return res.status(401).json({ code: 'INVALID_2FA_CODE', message: 'Invalid 2FA code' });
        }
        const recoveryCodes = await regenerateRecoveryCodes(userId);
        return res.json({ recovery_codes: recoveryCodes });
    }
    catch (err) {
        console.error('[Users] Regenerate recovery codes error:', err);
        return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
});
