import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db.js';
import { revokeRefreshTokensForSession, logSessionAudit, } from './auth-utils.js';
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const ADMIN_JWT_EXPIRY = '8h';
function getAdminFromToken(req) {
    const auth = req.get('Authorization');
    if (!auth?.startsWith('Bearer '))
        return null;
    try {
        const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
        if (decoded.type !== 'admin')
            return null;
        return decoded;
    }
    catch {
        return null;
    }
}
function requireAdmin(roles) {
    return (req, res, next) => {
        const admin = getAdminFromToken(req);
        if (!admin) {
            return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Admin authentication required' });
        }
        const row = db.prepare('SELECT is_active FROM admin_users WHERE id = ?').get(admin.sub);
        if (!row || !row.is_active) {
            return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Admin account inactive' });
        }
        ;
        req.admin = admin;
        if (roles && !roles.includes(admin.role)) {
            return res.status(403).json({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
        }
        next();
    };
}
function auditLog(actorId, actionType, targetType, targetId, beforeData, afterData, ip) {
    try {
        db.prepare(`INSERT INTO audit_logs (id, actor_id, action_type, target_type, target_id, before_data, after_data, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(crypto.randomUUID(), actorId, actionType, targetType, targetId ?? '', beforeData, afterData, ip);
    }
    catch (e) {
        console.error('[Audit]', e);
    }
}
function adminActionsLog(adminId, adminEmail, actionType, targetUserId, targetUserEmail, studioId, ip, reason, payload) {
    try {
        const hasTable = db.prepare('SELECT name FROM sqlite_master WHERE type="table" AND name="admin_actions"').get();
        if (hasTable) {
            db.prepare(`INSERT INTO admin_actions (id, admin_id, admin_email, action_type, target_user_id, target_user_email, studio_id, ip_address, reason, payload)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(crypto.randomUUID(), adminId, adminEmail, actionType, targetUserId, targetUserEmail, studioId, ip, reason, payload ? JSON.stringify(payload) : null);
        }
    }
    catch (e) {
        console.error('[AdminActions]', e);
    }
}
function seedAdminIfEmpty() {
    const count = db.prepare('SELECT COUNT(*) as c FROM admin_users').get();
    if (count.c === 0) {
        const id = crypto.randomUUID();
        const hash = bcrypt.hashSync('admin123', 10);
        db.prepare(`INSERT INTO admin_users (id, email, name, role, password_hash, is_active)
       VALUES (?, 'admin@archject.local', 'Admin', 'super-admin', ?, 1)`).run(id, hash);
        console.log('[Admin] Seeded default admin: admin@archject.local / admin123');
    }
}
export const adminRouter = Router();
adminRouter.get('/me', requireAdmin(), (req, res) => {
    const admin = req.admin;
    const row = db.prepare('SELECT id, email, name, role FROM admin_users WHERE id = ?').get(admin.sub);
    res.json(row || admin);
});
adminRouter.post('/login', async (req, res) => {
    try {
        seedAdminIfEmpty();
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Email and password required' });
        }
        const admin = db.prepare('SELECT * FROM admin_users WHERE email = ? AND is_active = 1').get(email);
        if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
            return res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
        }
        const token = jwt.sign({ sub: admin.id, email: admin.email, role: admin.role, type: 'admin' }, JWT_SECRET, { expiresIn: ADMIN_JWT_EXPIRY });
        return res.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } });
    }
    catch (err) {
        console.error('[Admin] Login error:', err);
        return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
});
adminRouter.get('/metrics/summary', requireAdmin(), (_req, res) => {
    try {
        const studios = db.prepare('SELECT COUNT(*) as c FROM studios').get();
        const approvals = db.prepare('SELECT COUNT(*) as c FROM analytics_daily_aggregates').get();
        const agg = db.prepare('SELECT SUM(approvals_count) as total, AVG(avg_turnaround_seconds) as avg FROM analytics_daily_aggregates WHERE date >= date("now", "-7 days")').get();
        res.json({
            activeStudios: studios?.c ?? 0,
            dailyApprovals: agg?.total ?? 0,
            avgTurnaroundSeconds: Math.round(agg?.avg ?? 0),
            platformErrorRate: 0.12,
        });
    }
    catch (e) {
        console.error('[Admin] metrics/summary:', e);
        res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
});
adminRouter.get('/metrics/series', requireAdmin(), (req, res) => {
    const metric = req.query.metric || 'approvals';
    const range = parseInt(req.query.range || '30', 10) || 30;
    const days = Math.min(Math.max(range, 7), 90);
    const series = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        series.push({ date: dateStr, value: Math.floor(Math.random() * 50) + 10 });
    }
    res.json({ series });
});
adminRouter.get('/health', requireAdmin(), (_req, res) => {
    const services = [
        { id: 's3', name: 'S3 Storage', status: 'healthy', lastChecked: new Date().toISOString(), message: null },
        { id: 'email', name: 'Email Provider', status: 'degraded', lastChecked: new Date().toISOString(), message: 'High latency' },
        { id: 'forge', name: 'Forge/Hosting', status: 'healthy', lastChecked: new Date().toISOString(), message: null },
        { id: 'db', name: 'Database Queue', status: 'healthy', lastChecked: new Date().toISOString(), message: null },
    ];
    res.json({ services, overall: 'degraded' });
});
adminRouter.post('/health/check', requireAdmin(), (req, res) => {
    const service = req.query.service;
    const status = service === 'email' ? 'degraded' : 'healthy';
    res.json({ service: service || 'all', status, lastChecked: new Date().toISOString() });
});
adminRouter.get('/users', requireAdmin(), (req, res) => {
    const q = req.query.q || '';
    const status = req.query.status;
    const role = req.query.role;
    const studioId = req.query.studioId;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const perPage = Math.min(100, Math.max(1, parseInt(req.query.perPage || '20', 10)));
    const sortBy = req.query.sortBy || 'createdAt';
    const sortDir = req.query.sortDir || 'desc';
    const orderCol = sortBy === 'name' ? 'u.first_name' : sortBy === 'lastLogin' ? 'u.created_at' : 'u.created_at';
    const orderDir = sortDir === 'asc' ? 'ASC' : 'DESC';
    let where = '1=1';
    const params = [];
    if (q) {
        where += ' AND (u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
        const like = `%${q}%`;
        params.push(like, like, like);
    }
    if (status === 'suspended') {
        where += ' AND u.id IN (SELECT user_id FROM user_suspensions)';
    }
    else if (status === 'active') {
        where += ' AND u.id NOT IN (SELECT user_id FROM user_suspensions)';
    }
    if (studioId && studioId !== 'all') {
        where += ' AND u.company = ?';
        params.push(studioId);
    }
    const countRow = db.prepare(`SELECT COUNT(*) as c FROM users u WHERE ${where}`).get(...params);
    const rows = db.prepare(`SELECT u.id, u.first_name, u.last_name, u.email, u.company, u.created_at,
            (SELECT 1 FROM user_suspensions s WHERE s.user_id = u.id) as is_suspended
     FROM users u WHERE ${where} ORDER BY ${orderCol} ${orderDir} LIMIT ? OFFSET ?`).all(...params, perPage, (page - 1) * perPage);
    const users = rows.map((r) => ({
        id: r.id,
        email: r.email,
        name: `${r.first_name} ${r.last_name}`.trim() || r.email,
        displayName: `${r.first_name} ${r.last_name}`.trim() || r.email,
        studioId: r.company || null,
        studios: r.company ? [{ id: r.company, name: r.company }] : [],
        status: (r.is_suspended ? 'suspended' : 'active'),
        role: role || 'member',
        lastLoginAt: null,
        createdAt: r.created_at,
    }));
    res.json({ data: users, users, total: countRow.c, page, perPage });
});
adminRouter.get('/users/:id/support-tickets', requireAdmin(), (req, res) => {
    const { id } = req.params;
    const rows = db.prepare(`SELECT id, project_id, requester_id, subject, status, priority, created_at, updated_at FROM support_tickets WHERE requester_id = ? ORDER BY created_at DESC`).all(id);
    const tickets = rows.map((r) => ({
        id: r.id,
        projectId: r.project_id,
        subject: r.subject,
        status: r.status,
        priority: r.priority,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    }));
    res.json({ tickets });
});
adminRouter.get('/users/:id', requireAdmin(), (req, res) => {
    const { id } = req.params;
    const user = db.prepare(`SELECT u.id, u.first_name, u.last_name, u.email, u.company, u.created_at,
            (SELECT 1 FROM user_suspensions s WHERE s.user_id = u.id) as is_suspended
     FROM users u WHERE u.id = ?`).get(id);
    if (!user)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found' });
    const sessions = [];
    res.json({
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`.trim() || user.email,
        displayName: `${user.first_name} ${user.last_name}`.trim() || user.email,
        studioId: user.company || null,
        studios: user.company ? [{ id: user.company, name: user.company }] : [],
        status: (user.is_suspended ? 'suspended' : 'active'),
        role: 'member',
        lastLoginAt: null,
        createdAt: user.created_at,
        sessions,
        supportTickets: [],
    });
});
adminRouter.patch('/users/:id', requireAdmin(['super-admin', 'admin']), (req, res) => {
    const { id } = req.params;
    const { status, displayName, roleId, reason } = req.body;
    const admin = req.admin;
    const userRow = db.prepare('SELECT id, first_name, last_name, email FROM users WHERE id = ?').get(id);
    if (!userRow)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found' });
    const wasSuspended = db.prepare('SELECT 1 FROM user_suspensions WHERE user_id = ?').get(id);
    const before = { status: wasSuspended ? 'suspended' : 'active', displayName: `${userRow.first_name} ${userRow.last_name}` };
    const updates = [];
    const params = [];
    if (displayName !== undefined && typeof displayName === 'string' && displayName.length >= 2 && displayName.length <= 100) {
        const parts = displayName.trim().split(/\s+/);
        const first = parts[0] ?? '';
        const last = parts.slice(1).join(' ') ?? '';
        updates.push('first_name = ?, last_name = ?');
        params.push(first, last);
    }
    if (status === 'suspended') {
        db.prepare('INSERT OR REPLACE INTO user_suspensions (user_id) VALUES (?)').run(id);
        adminActionsLog(admin.sub, admin.email, 'USER_SUSPEND', id, userRow.email, null, req.ip ?? null, reason ?? null, { before, after: { status: 'suspended' } });
    }
    else if (status === 'active') {
        db.prepare('DELETE FROM user_suspensions WHERE user_id = ?').run(id);
        adminActionsLog(admin.sub, admin.email, 'USER_REACTIVATE', id, userRow.email, null, req.ip ?? null, reason ?? null, { before, after: { status: 'active' } });
    }
    else if (status !== undefined) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'status must be suspended or active' });
    }
    if (updates.length > 0) {
        params.push(new Date().toISOString(), id);
        db.prepare(`UPDATE users SET ${updates.join(', ')}, updated_at = ? WHERE id = ?`).run(...params);
        if (roleId)
            adminActionsLog(admin.sub, admin.email, 'ROLE_CHANGE', id, userRow.email, null, req.ip ?? null, reason ?? null, { roleId });
    }
    auditLog(admin.sub, 'user_update', 'user', id, JSON.stringify(before), JSON.stringify({ status: status || 'active', displayName }), req.ip ?? null);
    res.json({ id, status: status || 'active', displayName });
});
adminRouter.post('/users/invite', requireAdmin(['super-admin', 'admin']), (req, res) => {
    const { emails, email, studioId, role, message, expiresInDays } = req.body;
    const admin = req.admin;
    const adminRow = db.prepare('SELECT email FROM admin_users WHERE id = ?').get(admin.sub);
    const adminEmail = adminRow?.email ?? '';
    const toInvite = Array.isArray(emails) ? emails : email ? [email] : [];
    if (toInvite.length === 0)
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Email or emails array required' });
    const expiresAt = new Date(Date.now() + (expiresInDays ?? 7) * 24 * 60 * 60 * 1000);
    const roleVal = role || 'member';
    const invitesCreated = [];
    const warnings = [];
    const seen = new Set();
    for (const e of toInvite) {
        const addr = String(e).trim().toLowerCase();
        if (!addr)
            continue;
        if (seen.has(addr)) {
            warnings.push(`Duplicate: ${addr}`);
            continue;
        }
        seen.add(addr);
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(addr);
        if (existing) {
            warnings.push(`User already exists: ${addr}`);
            continue;
        }
        const inviteId = crypto.randomUUID();
        db.prepare(`INSERT INTO user_invites (id, email, studio_id, role, status, invited_by, expires_at) VALUES (?, ?, ?, ?, 'pending', ?, ?)`).run(inviteId, addr, studioId || null, roleVal, admin.sub, expiresAt.toISOString());
        adminActionsLog(admin.sub, adminEmail, 'INVITE_CREATE', null, addr, studioId || null, req.ip ?? null, message ?? null, { role: roleVal });
        invitesCreated.push({ email: addr, inviteId, status: 'pending' });
    }
    res.status(201).json({ invitesCreated, warnings });
});
adminRouter.post('/users/invite/upload', requireAdmin(['super-admin', 'admin']), (req, res) => {
    const admin = req.admin;
    res.status(201).json({ jobId: crypto.randomUUID(), message: 'CSV upload queued' });
});
adminRouter.post('/users/bulk', requireAdmin(['super-admin', 'admin']), (req, res) => {
    const { action, userIds, payload, reason } = req.body;
    if (!action || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'action and userIds required' });
    }
    if (!reason || String(reason).trim().length < 10) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'reason required (min 10 chars)' });
    }
    const admin = req.admin;
    const adminRow = db.prepare('SELECT email FROM admin_users WHERE id = ?').get(admin.sub);
    const adminEmail = adminRow?.email ?? '';
    const results = [];
    for (const uid of userIds.slice(0, 100)) {
        const user = db.prepare('SELECT email FROM users WHERE id = ?').get(uid);
        if (!user) {
            results.push({ userId: uid, success: false, error: 'User not found' });
            continue;
        }
        try {
            if (action === 'suspend') {
                db.prepare('INSERT OR REPLACE INTO user_suspensions (user_id) VALUES (?)').run(uid);
                adminActionsLog(admin.sub, adminEmail, 'BULK_SUSPEND', uid, user.email, null, req.ip ?? null, reason, null);
                results.push({ userId: uid, success: true });
            }
            else if (action === 'reactivate') {
                db.prepare('DELETE FROM user_suspensions WHERE user_id = ?').run(uid);
                adminActionsLog(admin.sub, adminEmail, 'BULK_REACTIVATE', uid, user.email, null, req.ip ?? null, reason, null);
                results.push({ userId: uid, success: true });
            }
            else if (action === 'change_role' && payload?.roleId) {
                adminActionsLog(admin.sub, adminEmail, 'BULK_ROLE_CHANGE', uid, user.email, null, req.ip ?? null, reason, { roleId: payload.roleId });
                results.push({ userId: uid, success: true });
            }
            else {
                results.push({ userId: uid, success: false, error: 'Unsupported action' });
            }
        }
        catch (e) {
            results.push({ userId: uid, success: false, error: String(e) });
        }
    }
    if (userIds.length > 100) {
        res.json({ jobId: crypto.randomUUID(), results, message: 'Large batch queued' });
    }
    else {
        res.json({ results });
    }
});
adminRouter.post('/users/:id/impersonate', requireAdmin(['super-admin']), (req, res) => {
    const { id } = req.params;
    const { ttlSeconds } = req.body;
    const admin = req.admin;
    const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(id);
    if (!user)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found' });
    const ttl = Math.min(3600, Math.max(60, parseInt(ttlSeconds, 10) || 300));
    const token = jwt.sign({ sub: user.id, email: user.email, type: 'impersonation', adminId: admin.sub }, JWT_SECRET, { expiresIn: ttl });
    adminActionsLog(admin.sub, admin.email, 'USER_IMPERSONATE', id, user.email, null, req.ip ?? null, null, { ttlSeconds: ttl });
    res.json({ token, expiresAt: new Date(Date.now() + ttl * 1000).toISOString() });
});
adminRouter.get('/audit', requireAdmin(), (req, res) => {
    const adminId = req.query.adminId;
    const actionType = req.query.actionType;
    const targetUserId = req.query.targetUserId;
    const studioId = req.query.studioId;
    const from = req.query.from;
    const to = req.query.to;
    const exportCsv = req.query.export === 'csv';
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const perPage = Math.min(100, Math.max(1, parseInt(req.query.perPage || '20', 10)));
    let where = '1=1';
    const params = [];
    if (adminId) {
        where += ' AND admin_id = ?';
        params.push(adminId);
    }
    if (actionType) {
        where += ' AND action_type = ?';
        params.push(actionType);
    }
    if (targetUserId) {
        where += ' AND target_user_id = ?';
        params.push(targetUserId);
    }
    if (studioId) {
        where += ' AND studio_id = ?';
        params.push(studioId);
    }
    if (from) {
        where += ' AND timestamp >= ?';
        params.push(from);
    }
    if (to) {
        where += ' AND timestamp <= ?';
        params.push(to);
    }
    try {
        const hasTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='admin_actions'").get();
        if (!hasTable) {
            return res.json({ data: [], logs: [], total: 0, page: 1, perPage });
        }
        const countRow = db.prepare(`SELECT COUNT(*) as c FROM admin_actions WHERE ${where}`).get(...params);
        const rows = db.prepare(`SELECT * FROM admin_actions WHERE ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`).all(...params, perPage, (page - 1) * perPage);
        if (exportCsv) {
            const headers = ['id', 'admin_id', 'admin_email', 'action_type', 'target_user_id', 'target_user_email', 'timestamp', 'ip_address', 'reason'];
            const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => JSON.stringify(String(r[h] ?? ''))).join(','))].join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=admin-audit.csv');
            return res.send(csv);
        }
        res.json({ data: rows, logs: rows, total: countRow.c, page, perPage });
    }
    catch (e) {
        res.json({ data: [], logs: [], total: 0, page: 1, perPage });
    }
});
adminRouter.get('/analytics/users', requireAdmin(), (req, res) => {
    const range = req.query.range || '30d';
    const days = range === '90d' ? 90 : range === '365d' ? 365 : 30;
    const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get();
    const activeUsers = db.prepare('SELECT COUNT(*) as c FROM users u WHERE u.id NOT IN (SELECT user_id FROM user_suspensions)').get();
    const suspendedUsers = db.prepare('SELECT COUNT(*) as c FROM user_suspensions').get();
    const pendingInvites = db.prepare(`SELECT COUNT(*) as c FROM user_invites WHERE status = 'pending' AND expires_at > datetime('now')`).get();
    const series = Array.from({ length: Math.min(days, 30) }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (30 - i));
        return { date: d.toISOString().slice(0, 10), activeUsers: Math.floor(activeUsers.c * 0.9) + Math.floor(Math.random() * 5), invitesSent: Math.floor(Math.random() * 3) };
    });
    res.json({
        kpis: {
            totalUsers: totalUsers.c,
            activeUsers: activeUsers.c,
            suspendedUsers: suspendedUsers.c,
            pendingInvites: pendingInvites.c,
        },
        series,
    });
});
adminRouter.get('/sessions', requireAdmin(), (req, res) => {
    const userId = req.query.userId;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const perPage = 20;
    let where = '1=1';
    const params = [];
    if (userId) {
        where += ' AND admin_id = ?';
        params.push(userId);
    }
    const countRow = db.prepare(`SELECT COUNT(*) as c FROM admin_sessions WHERE ${where}`).get(...params);
    const rows = db.prepare(`SELECT session_id, admin_id, device, ip, last_active_at FROM admin_sessions WHERE ${where} ORDER BY last_active_at DESC LIMIT ? OFFSET ?`).all(...params, perPage, (page - 1) * perPage);
    const sessions = rows.map((r) => ({
        sessionId: r.session_id,
        userId: r.admin_id,
        device: r.device || 'Unknown',
        ip: r.ip || '—',
        lastActiveAt: r.last_active_at,
    }));
    res.json({ sessions, total: countRow.c, page, perPage });
});
adminRouter.delete('/sessions/:sessionId', requireAdmin(), (req, res) => {
    const { sessionId } = req.params;
    db.prepare('DELETE FROM admin_sessions WHERE session_id = ?').run(sessionId);
    res.json({ success: true });
});
adminRouter.post('/sessions/revoke-all', requireAdmin(), (req, res) => {
    const userId = req.query.userId;
    if (!userId)
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'userId required' });
    db.prepare('DELETE FROM admin_sessions WHERE admin_id = ?').run(userId);
    res.json({ success: true });
});
// User sessions (platform-wide monitoring)
adminRouter.get('/user-sessions', requireAdmin(), (req, res) => {
    try {
        const userId = req.query.userId;
        const email = req.query.email;
        const ip = req.query.ip;
        const platform = req.query.platform;
        const status = req.query.status;
        const from = req.query.from;
        const to = req.query.to;
        const page = Math.max(1, parseInt(req.query.page || '1', 10));
        const perPage = Math.min(100, Math.max(1, parseInt(req.query.perPage || '20', 10)));
        let where = '1=1';
        const params = [];
        if (userId) {
            where += ' AND s.user_id = ?';
            params.push(userId);
        }
        if (email) {
            where += ' AND u.email LIKE ?';
            params.push(`%${email}%`);
        }
        if (ip) {
            where += ' AND s.ip LIKE ?';
            params.push(`%${ip}%`);
        }
        if (platform) {
            where += ' AND s.platform = ?';
            params.push(platform);
        }
        if (status === 'revoked') {
            where += ' AND s.revoked_at IS NOT NULL';
        }
        else if (status === 'active') {
            where += ' AND s.revoked_at IS NULL';
        }
        if (from) {
            where += ' AND s.created_at >= ?';
            params.push(from);
        }
        if (to) {
            where += ' AND s.created_at <= ?';
            params.push(to);
        }
        const countRow = db.prepare(`SELECT COUNT(*) as c FROM sessions s JOIN users u ON s.user_id = u.id WHERE ${where}`).get(...params);
        const rows = db.prepare(`SELECT s.id, s.user_id, s.ip, s.user_agent, s.device_name, s.platform, s.geo_city, s.geo_country,
              s.created_at, s.last_active_at, s.revoked_at,
              u.email, u.first_name, u.last_name
       FROM sessions s JOIN users u ON s.user_id = u.id
       WHERE ${where} ORDER BY s.last_active_at DESC LIMIT ? OFFSET ?`).all(...params, perPage, (page - 1) * perPage);
        const sessions = rows.map((r) => ({
            id: r.id,
            sessionId: r.id,
            userId: r.user_id,
            userName: `${r.first_name} ${r.last_name}`.trim() || r.email,
            userEmail: r.email,
            device: r.device_name || (r.user_agent ? r.user_agent.slice(0, 50) : 'Unknown'),
            ip: r.ip || '—',
            platform: r.platform || 'web',
            geoCountry: r.geo_country,
            geoCity: r.geo_city,
            lastActiveAt: r.last_active_at,
            createdAt: r.created_at,
            revoked: !!r.revoked_at,
        }));
        res.json({ sessions, total: countRow.c, page, perPage });
    }
    catch (e) {
        console.error('[Admin] user-sessions:', e);
        res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
});
adminRouter.get('/user-sessions/metrics', requireAdmin(), (req, res) => {
    try {
        const activeSessions = db.prepare('SELECT COUNT(*) as c FROM sessions WHERE revoked_at IS NULL').get();
        const byPlatform = db.prepare(`SELECT COALESCE(platform, 'web') as platform, COUNT(*) as c FROM sessions WHERE revoked_at IS NULL
       GROUP BY COALESCE(platform, 'web')`).all();
        const byCountry = db.prepare(`SELECT geo_country, COUNT(*) as c FROM sessions WHERE revoked_at IS NULL AND geo_country IS NOT NULL AND geo_country != ''
       GROUP BY geo_country ORDER BY c DESC LIMIT 10`).all();
        res.json({
            activeSessions: activeSessions.c,
            byPlatform: byPlatform.map((p) => ({ platform: p.platform || 'web', count: p.c })),
            byCountry: byCountry.map((c) => ({ country: c.geo_country, count: c.c })),
        });
    }
    catch (e) {
        console.error('[Admin] user-sessions/metrics:', e);
        res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
});
adminRouter.post('/user-sessions/:id/revoke', requireAdmin(), (req, res) => {
    try {
        const { id } = req.params;
        const session = db.prepare('SELECT id, user_id FROM sessions WHERE id = ?').get(id);
        if (!session) {
            return res.status(404).json({ code: 'NOT_FOUND', message: 'Session not found' });
        }
        db.prepare('UPDATE sessions SET revoked_at = datetime("now") WHERE id = ?').run(id);
        revokeRefreshTokensForSession(id);
        logSessionAudit(session.user_id, id, 'revoke', { admin: true });
        res.json({ success: true });
    }
    catch (e) {
        console.error('[Admin] user-sessions revoke:', e);
        res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
});
adminRouter.post('/user-sessions/bulk-revoke', requireAdmin(), (req, res) => {
    try {
        const { sessionIds } = req.body;
        if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
            return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'sessionIds array required' });
        }
        const results = [];
        for (const sid of sessionIds.slice(0, 100)) {
            const session = db.prepare('SELECT id, user_id FROM sessions WHERE id = ?').get(sid);
            if (session) {
                db.prepare('UPDATE sessions SET revoked_at = datetime("now") WHERE id = ?').run(sid);
                revokeRefreshTokensForSession(sid);
                logSessionAudit(session.user_id, sid, 'revoke', { admin: true, bulk: true });
                results.push({ sessionId: sid, success: true });
            }
            else {
                results.push({ sessionId: sid, success: false });
            }
        }
        res.json({ results });
    }
    catch (e) {
        console.error('[Admin] user-sessions bulk-revoke:', e);
        res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
});
adminRouter.get('/user-sessions/export', requireAdmin(), (req, res) => {
    try {
        const format = req.query.format || 'csv';
        const userId = req.query.userId;
        const from = req.query.from;
        const to = req.query.to;
        let where = '1=1';
        const params = [];
        if (userId) {
            where += ' AND s.user_id = ?';
            params.push(userId);
        }
        if (from) {
            where += ' AND s.created_at >= ?';
            params.push(from);
        }
        if (to) {
            where += ' AND s.created_at <= ?';
            params.push(to);
        }
        const rows = db.prepare(`SELECT s.id, s.user_id, s.ip, s.user_agent, s.device_name, s.platform, s.geo_city, s.geo_country,
              s.created_at, s.last_active_at, s.revoked_at,
              u.email, u.first_name, u.last_name
       FROM sessions s JOIN users u ON s.user_id = u.id
       WHERE ${where} ORDER BY s.last_active_at DESC LIMIT 10000`).all(...params);
        if (format === 'json') {
            return res.json({ sessions: rows });
        }
        const headers = ['id', 'user_id', 'email', 'ip', 'platform', 'geo_country', 'created_at', 'last_active_at', 'revoked'];
        const csv = [
            headers.join(','),
            ...rows.map((r) => headers.map((h) => JSON.stringify(String(r[h] ?? ''))).join(',')),
        ].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=user-sessions.csv');
        res.send(csv);
    }
    catch (e) {
        console.error('[Admin] user-sessions export:', e);
        res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
});
adminRouter.get('/tickets', requireAdmin(), (req, res) => {
    const status = req.query.status;
    const priority = req.query.priority;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const perPage = 20;
    let where = '1=1';
    const params = [];
    if (status) {
        where += ' AND status = ?';
        params.push(status);
    }
    if (priority) {
        where += ' AND priority = ?';
        params.push(priority);
    }
    const countRow = db.prepare(`SELECT COUNT(*) as c FROM support_tickets WHERE ${where}`).get(...params);
    const rows = db.prepare(`SELECT id, project_id, subject, status, priority, assigned_admin_id, created_at, updated_at FROM support_tickets WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, perPage, (page - 1) * perPage);
    const tickets = rows.map((r) => ({
        id: r.id,
        projectId: r.project_id,
        subject: r.subject,
        status: r.status,
        priority: r.priority,
        assignedAdminId: r.assigned_admin_id,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    }));
    res.json({ tickets, total: countRow.c, page, perPage });
});
adminRouter.get('/tickets/:id', requireAdmin(), (req, res) => {
    const { id } = req.params;
    const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(id);
    if (!ticket)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Ticket not found' });
    const messages = db.prepare('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at').all(id);
    res.json({ ...ticket, messages });
});
adminRouter.post('/tickets/:id/reply', requireAdmin(), (req, res) => {
    const { id } = req.params;
    const { body, internalNote } = req.body;
    if (!body)
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'body required' });
    const admin = req.admin;
    const msgId = crypto.randomUUID();
    db.prepare(`INSERT INTO ticket_messages (id, ticket_id, author_id, body, internal_note) VALUES (?, ?, ?, ?, ?)`).run(msgId, id, admin.sub, body, internalNote ? 1 : 0);
    db.prepare('UPDATE support_tickets SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), id);
    res.status(201).json({ id: msgId, body, internalNote: !!internalNote });
});
adminRouter.patch('/tickets/:id', requireAdmin(), (req, res) => {
    const { id } = req.params;
    const { assign, status } = req.body;
    const admin = req.admin;
    const updates = [];
    const params = [];
    if (assign !== undefined) {
        updates.push('assigned_admin_id = ?');
        params.push(assign);
    }
    if (status !== undefined) {
        updates.push('status = ?');
        params.push(status);
    }
    if (updates.length === 0)
        return res.json({ id });
    updates.push('updated_at = ?');
    params.push(new Date().toISOString(), id);
    db.prepare(`UPDATE support_tickets SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    auditLog(admin.sub, 'ticket_update', 'ticket', id, null, JSON.stringify({ assign, status }), req.ip ?? null);
    res.json({ id, assign, status });
});
adminRouter.get('/audit-logs', requireAdmin(), (req, res) => {
    const actor = req.query.actor;
    const action = req.query.action;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const perPage = 20;
    let where = '1=1';
    const params = [];
    if (actor) {
        where += ' AND actor_id = ?';
        params.push(actor);
    }
    if (action) {
        where += ' AND action_type = ?';
        params.push(action);
    }
    const countRow = db.prepare(`SELECT COUNT(*) as c FROM audit_logs WHERE ${where}`).get(...params);
    const rows = db.prepare(`SELECT * FROM audit_logs WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, perPage, (page - 1) * perPage);
    res.json({ logs: rows, total: countRow.c, page, perPage });
});
adminRouter.post('/exports', requireAdmin(), (req, res) => {
    const admin = req.admin;
    const { type, params, scheduledCron } = req.body;
    const id = crypto.randomUUID();
    db.prepare(`INSERT INTO exports (id, requested_by, type, params, status, scheduled_cron) VALUES (?, ?, ?, ?, 'pending', ?)`).run(id, admin.sub, type || 'csv', params ? JSON.stringify(params) : null, scheduledCron || null);
    res.status(201).json({ id, status: 'pending', type: type || 'csv' });
});
adminRouter.get('/exports/:id', requireAdmin(), (req, res) => {
    const { id } = req.params;
    const row = db.prepare('SELECT * FROM exports WHERE id = ?').get(id);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Export not found' });
    res.json(row);
});
adminRouter.post('/exports/:id/run-now', requireAdmin(), (req, res) => {
    const { id } = req.params;
    db.prepare('UPDATE exports SET status = ?, last_run_at = ? WHERE id = ?').run('processing', new Date().toISOString(), id);
    res.json({ id, status: 'processing' });
});
adminRouter.get('/analytics/approvals', requireAdmin(), (req, res) => {
    const groupBy = req.query.groupBy || 'studio';
    const from = req.query.from;
    const to = req.query.to;
    const data = [
        { group: 'Studio A', approvals: 120, avgTurnaround: 2.4 },
        { group: 'Studio B', approvals: 85, avgTurnaround: 3.1 },
        { group: 'Studio C', approvals: 64, avgTurnaround: 1.8 },
    ];
    res.json({ groupBy, from, to, data });
});
adminRouter.get('/analytics/bottlenecks', requireAdmin(), (req, res) => {
    const from = req.query.from;
    const to = req.query.to;
    const studioId = req.query.studioId;
    res.json({ from, to, studioId, bottlenecks: [] });
});
adminRouter.post('/maintenance-mode', requireAdmin(['super-admin']), (req, res) => {
    const row = db.prepare('SELECT enabled FROM maintenance_mode WHERE id = 1').get();
    const enabled = row?.enabled ?? 0;
    const next = enabled ? 0 : 1;
    db.prepare('UPDATE maintenance_mode SET enabled = ?, updated_at = datetime("now") WHERE id = 1').run(next);
    res.json({ enabled: next === 1 });
});
// Terms of Service admin
adminRouter.post('/terms', requireAdmin(['super-admin', 'admin']), (req, res) => {
    try {
        const { version_number, content_markdown, effective_date, change_log } = req.body ?? {};
        if (!version_number || !content_markdown || !effective_date) {
            return res.status(400).json({ message: 'version_number, content_markdown, and effective_date are required' });
        }
        const effectiveDateStr = String(effective_date).slice(0, 10);
        const slug = `terms-${effectiveDateStr}`;
        const changeLogArr = Array.isArray(change_log) ? change_log : [{ date: effectiveDateStr, note: 'Initial version' }];
        const changeLogStr = JSON.stringify(changeLogArr);
        const id = crypto.randomUUID();
        db.prepare(`INSERT INTO terms_versions (id, version_number, slug, content_markdown, effective_date, change_log, published)
       VALUES (?, ?, ?, ?, ?, ?, 0)`).run(id, version_number, slug, content_markdown, effectiveDateStr, changeLogStr);
        return res.status(201).json({ id });
    }
    catch (err) {
        console.error('[Admin] Terms create error:', err);
        return res.status(500).json({ message: 'An error occurred' });
    }
});
adminRouter.patch('/terms/:id/publish', requireAdmin(['super-admin', 'admin']), (req, res) => {
    try {
        const { id } = req.params;
        const version = db.prepare('SELECT id FROM terms_versions WHERE id = ?').get(id);
        if (!version)
            return res.status(404).json({ message: 'Terms version not found' });
        db.prepare('UPDATE terms_versions SET published = 0').run();
        db.prepare('UPDATE terms_versions SET published = 1, updated_at = ? WHERE id = ?').run(new Date().toISOString(), id);
        return res.json({ success: true });
    }
    catch (err) {
        console.error('[Admin] Terms publish error:', err);
        return res.status(500).json({ message: 'An error occurred' });
    }
});
export { seedAdminIfEmpty };
