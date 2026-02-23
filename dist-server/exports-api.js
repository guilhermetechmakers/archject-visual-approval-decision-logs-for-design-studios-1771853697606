import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from './db.js';
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:3001';
function optionalAuth(req) {
    const auth = req.get('Authorization');
    if (!auth?.startsWith('Bearer '))
        return null;
    try {
        const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
        return decoded.sub;
    }
    catch {
        return null;
    }
}
function requireAuth(req, res, next) {
    const userId = optionalAuth(req);
    if (!userId) {
        return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' });
    }
    ;
    req.userId = userId;
    next();
}
const EXPORT_TYPES = ['csv', 'pdf', 'merged_pdf', 'signed_pdf', 'zip'];
export const exportsRouter = Router();
exportsRouter.post('/exports', requireAuth, (req, res) => {
    const userId = req.userId;
    const { projectId, decisionIds = [], types = ['pdf'], options = {} } = req.body;
    if (!projectId) {
        return res.status(400).json({
            code: 'VALIDATION_ERROR',
            message: 'projectId is required',
        });
    }
    const validTypes = types.filter((t) => EXPORT_TYPES.includes(t));
    if (validTypes.length === 0) {
        return res.status(400).json({
            code: 'VALIDATION_ERROR',
            message: 'At least one valid export type is required',
        });
    }
    const jobId = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO jobs (id, project_id, user_id, type, payload, status, cancellable, created_at, updated_at)
     VALUES (?, ?, ?, 'EXPORT_PDF', ?, 'QUEUED', 1, ?, ?)`).run(jobId, projectId, userId, JSON.stringify({
        decisionIds,
        types: validTypes,
        options,
    }), now, now);
    const exportIdsPending = [];
    for (const type of validTypes) {
        const exportId = crypto.randomUUID();
        db.prepare(`INSERT INTO exports (id, project_id, created_by, status, type, job_id, meta, download_count)
       VALUES (?, ?, ?, 'queued', ?, ?, ?, 0)`).run(exportId, projectId, userId, type, jobId, JSON.stringify({ decisionIds, options }));
        exportIdsPending.push(exportId);
    }
    res.status(202).json({ jobId, exportIdsPending });
});
exportsRouter.get('/exports/:exportId', requireAuth, (req, res) => {
    const { exportId } = req.params;
    const row = db.prepare('SELECT * FROM exports WHERE id = ?').get(exportId);
    if (!row) {
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Export not found' });
    }
    const baseUrl = (req.get('x-forwarded-proto') || req.protocol) + '://' + (req.get('x-forwarded-host') || req.get('host') || 'localhost:3001');
    const fileUrl = row.file_key
        ? `${baseUrl}/api/v1/exports/${exportId}/download`
        : null;
    res.json({
        id: row.id,
        project_id: row.project_id,
        created_by: row.created_by,
        created_at: row.created_at,
        status: row.status,
        type: row.type,
        file_url: fileUrl,
        file_name: row.file_name,
        file_size: row.file_size,
        signed: !!row.signed,
        signature_hash: row.signature_hash,
        meta: row.meta ? JSON.parse(row.meta) : null,
        download_count: row.download_count,
        expires_at: row.expires_at,
        job_id: row.job_id,
    });
});
exportsRouter.get('/exports', requireAuth, (req, res) => {
    const projectId = req.query.projectId;
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
    if (!projectId) {
        return res.status(400).json({
            code: 'VALIDATION_ERROR',
            message: 'projectId is required',
        });
    }
    const rows = db.prepare(`SELECT * FROM exports WHERE project_id = ? ORDER BY created_at DESC LIMIT ?`).all(projectId, limit);
    const baseUrl = (req.get('x-forwarded-proto') || req.protocol) + '://' + (req.get('x-forwarded-host') || req.get('host') || 'localhost:3001');
    const exports = rows.map((r) => ({
        id: r.id,
        projectId: r.project_id,
        createdBy: r.created_by,
        createdAt: r.created_at,
        status: r.status,
        type: r.type,
        fileKey: r.file_key,
        fileName: r.file_name,
        fileSize: r.file_size,
        signed: !!r.signed,
        signatureHash: r.signature_hash,
        jobId: r.job_id,
        meta: typeof r.meta === 'string' ? JSON.parse(r.meta) : r.meta,
        downloadCount: r.download_count ?? 0,
        expiresAt: r.expires_at,
        fileUrl: r.file_key ? `${baseUrl}/api/v1/exports/${r.id}/download` : null,
    }));
    res.json({ exports });
});
exportsRouter.get('/exports/:exportId/download', requireAuth, (req, res) => {
    const userId = req.userId;
    const { exportId } = req.params;
    const row = db.prepare('SELECT * FROM exports WHERE id = ?').get(exportId);
    if (!row) {
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Export not found' });
    }
    if (row.status !== 'ready') {
        return res.status(400).json({
            code: 'NOT_READY',
            message: 'Export is not yet ready for download',
        });
    }
    db.prepare('UPDATE exports SET download_count = download_count + 1 WHERE id = ?').run(exportId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${row.file_name ?? `export-${exportId.slice(0, 8)}.pdf`}"`);
    res.send(Buffer.from('%PDF-1.4 placeholder - actual export generated by worker'));
});
