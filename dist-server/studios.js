import { Router } from 'express';
import crypto from 'crypto';
import { db } from './db.js';
import { getUserIdFromAccessToken } from './auth-utils.js';
const DEFAULT_STUDIO_ID = 'default';
export const studiosRouter = Router();
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
function getStudioIdForUser(_userId) {
    return DEFAULT_STUDIO_ID;
}
studiosRouter.get('/:id', requireAuth, (req, res) => {
    try {
        const userId = req.userId;
        const studioId = req.params.id;
        if (studioId !== getStudioIdForUser(userId)) {
            return res.status(403).json({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        const studio = db.prepare('SELECT id, name, branding_logo_url, branding_favicon_url, branding_invoice_accent_color, client_link_branding, default_currency, created_at, updated_at FROM studios WHERE id = ?').get(studioId);
        if (!studio) {
            return res.status(404).json({ code: 'NOT_FOUND', message: 'Studio not found' });
        }
        const clientLinkBranding = studio.client_link_branding
            ? JSON.parse(studio.client_link_branding)
            : null;
        const sub = db.prepare('SELECT plan_id, seats, seats_used, status, billing_cycle FROM subscriptions WHERE studio_id = ? ORDER BY updated_at DESC LIMIT 1').get(studioId);
        const teamMembers = db.prepare(`SELECT stm.id, stm.email, stm.role, stm.invited_at, stm.accepted_at, u.first_name, u.last_name
       FROM studio_team_members stm
       LEFT JOIN users u ON u.id = stm.user_id
       WHERE stm.studio_id = ?
       ORDER BY stm.invited_at DESC`).all(studioId);
        return res.json({
            id: studio.id,
            name: studio.name,
            logo_url: studio.branding_logo_url,
            favicon_url: studio.branding_favicon_url ?? null,
            brand_color: studio.branding_invoice_accent_color ?? '#0052CC',
            client_link_branding: clientLinkBranding,
            default_currency: studio.default_currency,
            subscription: sub
                ? {
                    plan_id: sub.plan_id,
                    seats: sub.seats,
                    seats_used: sub.seats_used,
                    status: sub.status,
                    billing_cycle: sub.billing_cycle,
                }
                : null,
            team_members: teamMembers.map((m) => ({
                id: m.id,
                email: m.email,
                name: m.first_name && m.last_name ? `${m.first_name} ${m.last_name}` : null,
                role: m.role,
                status: m.accepted_at ? 'active' : 'pending',
                invited_at: m.invited_at,
            })),
        });
    }
    catch (err) {
        console.error('[Studios] Get error:', err);
        return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
});
studiosRouter.put('/:id', requireAuth, (req, res) => {
    try {
        const userId = req.userId;
        const studioId = req.params.id;
        if (studioId !== getStudioIdForUser(userId)) {
            return res.status(403).json({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        const { name, logo_url, favicon_url, brand_color, client_link_branding } = req.body;
        const updates = [];
        const values = [];
        if (typeof name === 'string' && name.length >= 1 && name.length <= 200) {
            updates.push('name = ?');
            values.push(name);
        }
        if (logo_url !== undefined) {
            updates.push('branding_logo_url = ?');
            values.push(typeof logo_url === 'string' ? logo_url : null);
        }
        if (favicon_url !== undefined) {
            updates.push('branding_favicon_url = ?');
            values.push(typeof favicon_url === 'string' ? favicon_url : null);
        }
        if (typeof brand_color === 'string' && brand_color.length <= 32) {
            updates.push('branding_invoice_accent_color = ?');
            values.push(brand_color);
        }
        if (client_link_branding !== undefined && typeof client_link_branding === 'object') {
            updates.push('client_link_branding = ?');
            values.push(JSON.stringify(client_link_branding));
        }
        if (updates.length === 0) {
            return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'No valid fields to update' });
        }
        updates.push('updated_at = datetime("now")');
        values.push(studioId);
        db.prepare(`UPDATE studios SET ${updates.join(', ')} WHERE id = ?`).run(...values);
        const studio = db.prepare('SELECT id, name, branding_logo_url, branding_favicon_url, branding_invoice_accent_color, client_link_branding FROM studios WHERE id = ?').get(studioId);
        const clb = studio.client_link_branding
            ? JSON.parse(studio.client_link_branding)
            : null;
        return res.json({
            id: studio.id,
            name: studio.name,
            logo_url: studio.branding_logo_url,
            favicon_url: studio.branding_favicon_url ?? null,
            brand_color: studio.branding_invoice_accent_color ?? '#0052CC',
            client_link_branding: clb,
        });
    }
    catch (err) {
        console.error('[Studios] Put error:', err);
        return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
});
studiosRouter.get('/:id/defaults', requireAuth, (req, res) => {
    try {
        const userId = req.userId;
        const studioId = req.params.id;
        if (studioId !== getStudioIdForUser(userId)) {
            return res.status(403).json({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        const studio = db.prepare('SELECT project_defaults FROM studios WHERE id = ?').get(studioId);
        const defaults = studio?.project_defaults
            ? JSON.parse(studio.project_defaults)
            : {};
        return res.json({
            reminderCadence: defaults.reminderCadence ?? 'immediately',
            exportFormats: defaults.exportFormats ?? ['pdf', 'csv'],
            autoNotification: defaults.autoNotification ?? true,
        });
    }
    catch (err) {
        console.error('[Studios] Defaults get error:', err);
        return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
});
studiosRouter.put('/:id/defaults', requireAuth, (req, res) => {
    try {
        const userId = req.userId;
        const studioId = req.params.id;
        if (studioId !== getStudioIdForUser(userId)) {
            return res.status(403).json({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        const { reminderCadence, exportFormats, autoNotification } = req.body;
        const payload = {};
        if (['immediately', 'daily', 'weekly'].includes(reminderCadence)) {
            payload.reminderCadence = reminderCadence;
        }
        if (Array.isArray(exportFormats)) {
            payload.exportFormats = exportFormats;
        }
        if (typeof autoNotification === 'boolean') {
            payload.autoNotification = autoNotification;
        }
        db.prepare('UPDATE studios SET project_defaults = ?, updated_at = datetime("now") WHERE id = ?').run(JSON.stringify(payload), studioId);
        return res.json({
            reminderCadence: payload.reminderCadence ?? 'immediately',
            exportFormats: payload.exportFormats ?? ['pdf', 'csv'],
            autoNotification: payload.autoNotification ?? true,
        });
    }
    catch (err) {
        console.error('[Studios] Defaults put error:', err);
        return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
});
studiosRouter.get('/:id/email-templates', requireAuth, (req, res) => {
    try {
        const userId = req.userId;
        const studioId = req.params.id;
        if (studioId !== getStudioIdForUser(userId)) {
            return res.status(403).json({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        const rows = db.prepare('SELECT template_key, subject, body FROM studio_email_templates WHERE studio_id = ?').all(studioId);
        const defaults = [
            { templateKey: 'invite', subject: 'You\'re invited to {{studio_name}}', body: 'Hi {{user_name}},\n\nYou have been invited to join {{studio_name}}.' },
            { templateKey: 'decision_ready', subject: 'Decision ready for review', body: 'Decision {{decision_title}} is ready for your review.' },
        ];
        const seen = new Set(rows.map((r) => r.template_key));
        const result = [...rows.map((r) => ({ templateKey: r.template_key, subject: r.subject, body: r.body }))];
        for (const d of defaults) {
            if (!seen.has(d.templateKey)) {
                result.push(d);
            }
        }
        return res.json(result);
    }
    catch (err) {
        console.error('[Studios] Email templates error:', err);
        return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
});
studiosRouter.put('/:id/email-templates/:key', requireAuth, (req, res) => {
    try {
        const userId = req.userId;
        const studioId = req.params.id;
        const key = req.params.key;
        if (studioId !== getStudioIdForUser(userId)) {
            return res.status(403).json({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        const { subject, body } = req.body;
        if (typeof subject !== 'string' || subject.length > 200) {
            return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Invalid subject' });
        }
        if (typeof body !== 'string' || body.length > 50000) {
            return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Body too long' });
        }
        const existing = db.prepare('SELECT id FROM studio_email_templates WHERE studio_id = ? AND template_key = ?').get(studioId, key);
        if (existing) {
            db.prepare('UPDATE studio_email_templates SET subject = ?, body = ?, updated_at = datetime("now") WHERE id = ?').run(subject, body, existing.id);
        }
        else {
            const id = crypto.randomUUID();
            db.prepare(`INSERT INTO studio_email_templates (id, studio_id, template_key, subject, body) VALUES (?, ?, ?, ?, ?)`).run(id, studioId, key, subject, body);
        }
        return res.json({ templateKey: key, subject, body });
    }
    catch (err) {
        console.error('[Studios] Email template update error:', err);
        return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
});
studiosRouter.post('/:id/team-members', requireAuth, (req, res) => {
    try {
        const userId = req.userId;
        const studioId = req.params.id;
        if (studioId !== getStudioIdForUser(userId)) {
            return res.status(403).json({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        const { email, role } = req.body;
        if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Valid email required' });
        }
        const validRoles = ['owner', 'admin', 'editor', 'viewer'];
        const r = typeof role === 'string' && validRoles.includes(role) ? role : 'viewer';
        const existing = db.prepare('SELECT id FROM studio_team_members WHERE studio_id = ? AND email = ?').get(studioId, email.toLowerCase());
        if (existing) {
            return res.status(400).json({ code: 'ALREADY_INVITED', message: 'Already invited' });
        }
        const id = crypto.randomUUID();
        db.prepare(`INSERT INTO studio_team_members (id, studio_id, email, role, invited_by) VALUES (?, ?, ?, ?, ?)`).run(id, studioId, email.toLowerCase(), r, userId);
        const member = db.prepare('SELECT id, email, role, invited_at, accepted_at FROM studio_team_members WHERE id = ?').get(id);
        db.prepare(`INSERT INTO audit_logs (id, actor_id, action_type, target_type, target_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))`).run(crypto.randomUUID(), userId, 'team_member_invited', 'studio_team_member', member.id, JSON.stringify({ studio_id: studioId, email: member.email, role: member.role }));
        return res.status(201).json({
            id: member.id,
            email: member.email,
            role: member.role,
            status: 'pending',
            invited_at: member.invited_at,
        });
    }
    catch (err) {
        console.error('[Studios] Invite error:', err);
        return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
});
studiosRouter.put('/:id/team-members/:memberId', requireAuth, (req, res) => {
    try {
        const userId = req.userId;
        const studioId = req.params.id;
        const memberId = req.params.memberId;
        if (studioId !== getStudioIdForUser(userId)) {
            return res.status(403).json({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        const { role } = req.body;
        const validRoles = ['owner', 'admin', 'editor', 'viewer'];
        if (!role || !validRoles.includes(role)) {
            return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Invalid role' });
        }
        const member = db.prepare('SELECT id, role FROM studio_team_members WHERE id = ? AND studio_id = ?').get(memberId, studioId);
        if (!member) {
            return res.status(404).json({ code: 'NOT_FOUND', message: 'Member not found' });
        }
        db.prepare('UPDATE studio_team_members SET role = ? WHERE id = ?').run(role, memberId);
        db.prepare(`INSERT INTO audit_logs (id, actor_id, action_type, target_type, target_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))`).run(crypto.randomUUID(), userId, 'team_member_role_changed', 'studio_team_member', memberId, JSON.stringify({ studio_id: studioId, new_role: role }));
        const updated = db.prepare('SELECT id, email, role, invited_at, accepted_at FROM studio_team_members WHERE id = ?').get(memberId);
        return res.json({
            id: updated.id,
            email: updated.email,
            role: updated.role,
            status: updated.accepted_at ? 'active' : 'pending',
            invited_at: updated.invited_at,
        });
    }
    catch (err) {
        console.error('[Studios] Update member error:', err);
        return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
});
studiosRouter.delete('/:id/team-members/:memberId', requireAuth, (req, res) => {
    try {
        const userId = req.userId;
        const studioId = req.params.id;
        const memberId = req.params.memberId;
        if (studioId !== getStudioIdForUser(userId)) {
            return res.status(403).json({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        const member = db.prepare('SELECT id, email FROM studio_team_members WHERE id = ? AND studio_id = ?').get(memberId, studioId);
        if (!member) {
            return res.status(404).json({ code: 'NOT_FOUND', message: 'Member not found' });
        }
        db.prepare('DELETE FROM studio_team_members WHERE id = ?').run(memberId);
        db.prepare(`INSERT INTO audit_logs (id, actor_id, action_type, target_type, target_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))`).run(crypto.randomUUID(), userId, 'team_member_removed', 'studio_team_member', memberId, JSON.stringify({ studio_id: studioId, email: member.email }));
        return res.status(204).send();
    }
    catch (err) {
        console.error('[Studios] Remove member error:', err);
        return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
});
studiosRouter.get('/:id/audit-log', requireAuth, (req, res) => {
    try {
        const userId = req.userId;
        const studioId = req.params.id;
        if (studioId !== getStudioIdForUser(userId)) {
            return res.status(403).json({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        const rows = db.prepare(`SELECT al.id, al.action_type, al.metadata, al.created_at, u.first_name, u.last_name
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_id
       WHERE al.metadata LIKE ?
       ORDER BY al.created_at DESC
       LIMIT 50`).all(`%"studio_id":"${studioId}"%`);
        return res.json(rows.map((r) => ({
            id: r.id,
            action: r.action_type,
            actor: r.first_name && r.last_name ? `${r.first_name} ${r.last_name}` : 'System',
            metadata: r.metadata ? JSON.parse(r.metadata) : {},
            created_at: r.created_at,
        })));
    }
    catch (err) {
        console.error('[Studios] Audit log error:', err);
        return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
});
