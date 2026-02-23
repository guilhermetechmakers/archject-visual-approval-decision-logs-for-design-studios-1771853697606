import { Router } from 'express';
import crypto from 'crypto';
import { db } from './db.js';
import { checkLeadsRateLimit } from './rate-limit.js';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d\s\-+().]{7,50}$/;
const COLOR_HEX_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress ?? '127.0.0.1';
}
export const leadsRouter = Router();
/** POST /api/leads/demo - store demo request */
leadsRouter.post('/demo', (req, res) => {
    try {
        const ip = getClientIp(req);
        const limit = checkLeadsRateLimit(ip);
        if (!limit.allowed) {
            return res.status(429).json({
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests. Please try again later.',
                retryAfter: limit.nextAllowedAt ? Math.ceil((limit.nextAllowedAt - Date.now()) / 1000) : 60,
            });
        }
        const { name, email, studioName, phone, studioSize, message, utmSource } = req.body;
        if (!name || typeof name !== 'string' || name.trim().length < 2 || name.length > 100) {
            return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Name required (2–100 chars)' });
        }
        if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email) || email.length > 320) {
            return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Valid email required' });
        }
        if (typeof message === 'string' && message.length > 2000) {
            return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Message max 2000 chars' });
        }
        if (typeof phone === 'string' && phone.trim() && !PHONE_REGEX.test(phone)) {
            return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Invalid phone format' });
        }
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        db.prepare(`INSERT INTO leads (id, type, name, email, studio_name, phone, studio_size, message, utm_source, ip_address, status, created_at)
       VALUES (?, 'demo', ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)`).run(id, name.trim().slice(0, 255), email.trim().slice(0, 320), typeof studioName === 'string' ? studioName.trim().slice(0, 255) : null, typeof phone === 'string' && phone.trim() ? phone.trim().slice(0, 50) : null, typeof studioSize === 'string' ? studioSize.trim().slice(0, 50) : null, typeof message === 'string' ? message.trim().slice(0, 2000) : null, typeof utmSource === 'string' ? utmSource.trim().slice(0, 255) : null, ip, now);
        // TODO: send email to sales/support via SendGrid/SES
        // TODO: optional webhook to Slack/CRM
        res.status(201).json({ id, message: 'Demo request received. We will be in touch soon.' });
    }
    catch (e) {
        console.error('[Leads] POST /demo:', e);
        res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to submit demo request' });
    }
});
/** POST /api/leads/signup - newsletter/waitlist signup */
leadsRouter.post('/signup', (req, res) => {
    try {
        const ip = getClientIp(req);
        const limit = checkLeadsRateLimit(ip);
        if (!limit.allowed) {
            return res.status(429).json({
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests. Please try again later.',
                retryAfter: limit.nextAllowedAt ? Math.ceil((limit.nextAllowedAt - Date.now()) / 1000) : 60,
            });
        }
        const { email, utmSource } = req.body;
        if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email) || email.length > 320) {
            return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Valid email required' });
        }
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        db.prepare(`INSERT INTO leads (id, type, email, utm_source, ip_address, status, created_at)
       VALUES (?, 'signup', ?, ?, ?, 'new', ?)`).run(id, email.trim().slice(0, 320), typeof utmSource === 'string' ? utmSource.trim().slice(0, 255) : null, ip, now);
        // TODO: optional welcome email
        res.status(201).json({ id, message: 'You\'re on the list. We\'ll notify you when we launch.' });
    }
    catch (e) {
        console.error('[Leads] POST /signup:', e);
        res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to sign up' });
    }
});
export const brandingRouter = Router();
/** GET /api/branding/:studioId/preview - public branding preview (read-only) */
brandingRouter.get('/:studioId/preview', (req, res) => {
    try {
        const { studioId } = req.params;
        const row = db.prepare('SELECT id, name, branding_logo_url, branding_invoice_accent_color FROM studios WHERE id = ?').get(studioId);
        if (!row) {
            return res.status(404).json({ code: 'NOT_FOUND', message: 'Studio not found' });
        }
        const primaryColor = row.branding_invoice_accent_color;
        if (primaryColor && !COLOR_HEX_REGEX.test(primaryColor)) {
            return res.json({
                studioId: row.id,
                name: row.name,
                logoUrl: row.branding_logo_url,
                logoAlt: `${row.name} logo`,
                primaryColor: '#0052CC',
                customDomain: null,
            });
        }
        res.json({
            studioId: row.id,
            name: row.name,
            logoUrl: row.branding_logo_url,
            logoAlt: `${row.name} logo`,
            primaryColor: primaryColor ?? '#0052CC',
            customDomain: null,
        });
    }
    catch (e) {
        console.error('[Leads] GET /branding/:studioId/preview:', e);
        res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to fetch branding' });
    }
});
