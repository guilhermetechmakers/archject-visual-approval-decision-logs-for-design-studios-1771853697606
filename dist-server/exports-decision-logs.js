import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from './db.js';
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:3001';
function requireAuth(req, res, next) {
    const auth = req.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
        res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' });
        return;
    }
    try {
        const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
        req.userId = decoded.sub;
        next();
    }
    catch {
        res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid or expired token' });
    }
}
function runExportJobWorker(jobId) {
    const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
    if (!row || (row.type !== 'EXPORT_PDF' && row.type !== 'EXPORT_CSV'))
        return;
    const steps = [
        { name: 'Queued', status: 'completed' },
        { name: 'Preparing', status: 'in_progress' },
        { name: 'Generating', status: 'pending' },
        { name: 'Signing', status: 'pending' },
        { name: 'Packaging', status: 'pending' },
        { name: 'Ready', status: 'pending' },
    ];
    const updateProgress = (percent, currentStep, stepIndex) => {
        const stepsCopy = steps.map((s, i) => ({
            ...s,
            status: (i < stepIndex ? 'completed' : i === stepIndex ? 'in_progress' : 'pending'),
        }));
        db.prepare('UPDATE jobs SET status = ?, progress_percent = ?, current_step = ?, steps = ?, updated_at = ? WHERE id = ?').run('IN_PROGRESS', percent, currentStep, JSON.stringify(stepsCopy), new Date().toISOString(), jobId);
    };
    const completeJob = (resultUrls) => {
        const stepsComplete = steps.map((s) => ({ ...s, status: 'completed' }));
        db.prepare('UPDATE jobs SET status = ?, progress_percent = 100, current_step = ?, steps = ?, result_urls = ?, updated_at = ?, completed_at = ? WHERE id = ?').run('COMPLETED', 'Ready', JSON.stringify(stepsComplete), JSON.stringify(resultUrls), new Date().toISOString(), new Date().toISOString(), jobId);
    };
    setTimeout(() => {
        const current = db.prepare('SELECT status FROM jobs WHERE id = ?').get(jobId);
        if (current?.status === 'CANCELLED')
            return;
        updateProgress(10, 'Preparing', 1);
    }, 500);
    setTimeout(() => {
        const current = db.prepare('SELECT status FROM jobs WHERE id = ?').get(jobId);
        if (current?.status === 'CANCELLED')
            return;
        updateProgress(30, 'Generating', 2);
    }, 1500);
    setTimeout(() => {
        const current = db.prepare('SELECT status FROM jobs WHERE id = ?').get(jobId);
        if (current?.status === 'CANCELLED')
            return;
        updateProgress(60, 'Signing', 3);
    }, 2500);
    setTimeout(() => {
        const current = db.prepare('SELECT status FROM jobs WHERE id = ?').get(jobId);
        if (current?.status === 'CANCELLED')
            return;
        updateProgress(85, 'Packaging', 4);
    }, 3500);
    setTimeout(() => {
        const current = db.prepare('SELECT status FROM jobs WHERE id = ?').get(jobId);
        if (current?.status === 'CANCELLED')
            return;
        const baseUrl = API_BASE;
        const ext = row.type === 'EXPORT_CSV' ? 'csv' : 'pdf';
        const resultUrls = [
            {
                name: `decision-log-${jobId.slice(0, 8)}.${ext}`,
                url: `${baseUrl}/api/exports/${jobId}/download`,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            },
        ];
        completeJob(resultUrls);
    }, 4500);
}
export const exportsDecisionLogsRouter = Router();
// POST /api/exports/create
exportsDecisionLogsRouter.post('/exports/create', requireAuth, (req, res) => {
    const userId = req.userId;
    const { projectId, decisionIds = [], format = 'PDF', includeAttachments = false, brandingProfileId, signatureRequested = false, coverOptions, } = req.body;
    if (!projectId) {
        return res.status(400).json({
            code: 'VALIDATION_ERROR',
            message: 'projectId is required',
        });
    }
    const validFormat = format === 'CSV' ? 'EXPORT_CSV' : 'EXPORT_PDF';
    const jobId = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO jobs (id, project_id, user_id, type, payload, status, cancellable, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'QUEUED', 1, ?, ?)`).run(jobId, projectId, userId, validFormat, JSON.stringify({
        decisionIds,
        types: [format.toLowerCase()],
        options: {
            includeAttachments,
            brandingId: brandingProfileId,
            signatureRequested,
            coverOptions,
        },
    }), now, now);
    const exportId = crypto.randomUUID();
    db.prepare(`INSERT INTO exports (id, project_id, created_by, status, type, job_id, meta, download_count)
     VALUES (?, ?, ?, 'queued', ?, ?, ?, 0)`).run(exportId, projectId, userId, format.toLowerCase(), jobId, JSON.stringify({
        decisionIds,
        includeAttachments,
        brandingProfileId,
        signatureRequested,
        coverOptions,
    }));
    runExportJobWorker(jobId);
    res.status(201).json({ jobId, status: 'QUEUED' });
});
// GET /api/exports/:jobId/status
exportsDecisionLogsRouter.get('/exports/:jobId/status', requireAuth, (req, res) => {
    const userId = req.userId;
    const { jobId } = req.params;
    const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
    if (!row) {
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Export job not found' });
    }
    if (row.user_id !== userId) {
        return res.status(403).json({ code: 'FORBIDDEN', message: 'Access denied' });
    }
    const baseUrl = (req.get('x-forwarded-proto') || req.protocol) + '://' + (req.get('x-forwarded-host') || req.get('host') || 'localhost:3001');
    let downloadUrl = null;
    if (row.status === 'COMPLETED' && row.result_urls) {
        try {
            const urls = JSON.parse(row.result_urls);
            const first = urls[0];
            if (first?.url) {
                downloadUrl = first.url.startsWith('/') ? `${baseUrl}${first.url}` : first.url;
            }
        }
        catch {
            // ignore
        }
    }
    const statusMap = {
        QUEUED: 'processing',
        IN_PROGRESS: 'processing',
        COMPLETED: 'ready',
        FAILED: 'failed',
        CANCELLED: 'failed',
    };
    let error;
    if (row.status === 'FAILED' && row.error) {
        try {
            const err = JSON.parse(row.error);
            error = err.message;
        }
        catch {
            error = row.error;
        }
    }
    res.json({
        status: statusMap[row.status] ?? 'processing',
        progress: row.progress_percent ?? 0,
        downloadUrl: downloadUrl ?? undefined,
        error,
    });
});
// GET /api/exports/:jobId/download
exportsDecisionLogsRouter.get('/exports/:jobId/download', requireAuth, (req, res) => {
    const userId = req.userId;
    const { jobId } = req.params;
    const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
    if (!row) {
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Export not found' });
    }
    if (row.user_id !== userId) {
        return res.status(403).json({ code: 'FORBIDDEN', message: 'Access denied' });
    }
    if (row.status !== 'COMPLETED') {
        return res.status(400).json({ code: 'NOT_READY', message: 'Export not yet completed' });
    }
    const ext = row.type === 'EXPORT_CSV' ? 'csv' : 'pdf';
    const contentType = ext === 'csv' ? 'text/csv' : 'application/pdf';
    const filename = `decision-log-${jobId.slice(0, 8)}.${ext}`;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(ext === 'csv' ? 'id,project_id,title,status,created_at\n' : '%PDF-1.4 placeholder - actual export generated by worker'));
});
// GET /api/branding/profiles
exportsDecisionLogsRouter.get('/branding/profiles', requireAuth, (_req, res) => {
    const rows = db.prepare('SELECT id, name, branding_logo_url, branding_invoice_accent_color FROM studios WHERE id IS NOT NULL').all();
    const profiles = rows.map((r) => ({
        id: r.id,
        studioId: r.id,
        name: r.name,
        logoUrl: r.branding_logo_url,
        colorHex: r.branding_invoice_accent_color ?? '#0052CC',
        domain: null,
        font: null,
        headerMarkdown: null,
        isActive: true,
    }));
    res.json({ profiles });
});
// POST /api/branding/profiles
exportsDecisionLogsRouter.post('/branding/profiles', requireAuth, (req, res) => {
    const { id, name, logoUrl, colorHex, domain, font, headerMarkdown, isActive } = req.body;
    const studioId = id ?? 'default';
    const existing = db.prepare('SELECT id FROM studios WHERE id = ?').get(studioId);
    if (!existing) {
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Studio not found' });
    }
    const updates = [];
    const params = [];
    if (name != null) {
        updates.push('name = ?');
        params.push(name);
    }
    if (logoUrl !== undefined) {
        updates.push('branding_logo_url = ?');
        params.push(logoUrl);
    }
    if (colorHex !== undefined) {
        updates.push('branding_invoice_accent_color = ?');
        params.push(colorHex);
    }
    params.push(studioId);
    if (updates.length > 0) {
        db.prepare(`UPDATE studios SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }
    const row = db.prepare('SELECT id, name, branding_logo_url, branding_invoice_accent_color FROM studios WHERE id = ?').get(studioId);
    res.json({
        id: row.id,
        studioId: row.id,
        name: row.name,
        logoUrl: row.branding_logo_url,
        colorHex: row.branding_invoice_accent_color ?? '#0052CC',
        domain: domain ?? null,
        font: font ?? null,
        headerMarkdown: headerMarkdown ?? null,
        isActive: isActive ?? true,
    });
});
// GET /api/decision-logs/:decisionId/audit
exportsDecisionLogsRouter.get('/decision-logs/:decisionId/audit', requireAuth, (req, res) => {
    const { decisionId } = req.params;
    const decision = db.prepare('SELECT id FROM decisions WHERE id = ?').get(decisionId);
    if (!decision) {
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' });
    }
    const rows = db.prepare('SELECT id, decision_id, action, performed_by, performed_at, details FROM decision_audit_log WHERE decision_id = ? ORDER BY performed_at ASC').all(decisionId);
    const entries = rows.map((r) => ({
        id: r.id,
        decisionId: r.decision_id,
        action: r.action,
        performedBy: r.performed_by,
        timestamp: r.performed_at,
        details: r.details ? JSON.parse(r.details) : null,
    }));
    res.json({ entries });
});
// GET /api/exports/history
exportsDecisionLogsRouter.get('/exports/history', requireAuth, (req, res) => {
    const userId = req.userId;
    const projectId = req.query.projectId;
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
    let where = 'created_by = ?';
    const params = [userId];
    if (projectId) {
        where += ' AND project_id = ?';
        params.push(projectId);
    }
    params.push(limit);
    const rows = db.prepare(`SELECT e.id, e.project_id, e.created_by, e.created_at, e.status, e.type, e.job_id, e.meta, e.file_key, j.status as job_status, j.result_urls
     FROM exports e
     LEFT JOIN jobs j ON j.id = e.job_id
     WHERE ${where} ORDER BY e.created_at DESC LIMIT ?`).all(...params);
    const baseUrl = (req.get('x-forwarded-proto') || req.protocol) + '://' + (req.get('x-forwarded-host') || req.get('host') || 'localhost:3001');
    const exports = rows.map((r) => {
        const meta = r.meta ? JSON.parse(r.meta) : {};
        const decisionIds = meta.decisionIds ?? [];
        const includeAttachments = meta.includeAttachments === true;
        const jobCompleted = r.job_status === 'COMPLETED';
        const status = jobCompleted ? 'ready' : r.job_status === 'FAILED' || r.job_status === 'CANCELLED' ? 'failed' : r.status === 'ready' ? 'ready' : 'processing';
        let downloadUrl = null;
        if (jobCompleted && r.job_id) {
            downloadUrl = `${baseUrl}/api/exports/${r.job_id}/download`;
        }
        else if (r.file_key) {
            downloadUrl = `${baseUrl}/api/v1/exports/${r.id}/download`;
        }
        return {
            id: r.id,
            exportJobId: r.job_id ?? r.id,
            userId: r.created_by ?? userId,
            projectId: r.project_id,
            decisionCount: decisionIds.length,
            format: r.type,
            includeAttachments,
            brandingProfileId: meta.brandingProfileId ?? null,
            signed: meta.signatureRequested === true,
            status,
            createdAt: r.created_at,
            completedAt: jobCompleted ? r.created_at : null,
            downloadUrl,
        };
    });
    res.json({ exports });
});
