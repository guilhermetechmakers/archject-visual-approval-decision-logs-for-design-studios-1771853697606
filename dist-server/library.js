import { Router } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { db } from './db.js';
import { getUserIdFromAccessToken } from './auth-utils.js';
const UPLOAD_BASE = process.env.UPLOAD_BASE_URL ?? '/uploads';
const LIBRARY_MAX_SIZE = 50 * 1024 * 1024; // 50MB per file
const ALLOWED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/svg+xml',
    'image/gif',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/octet-stream', // DWG and other CAD formats
];
const uploadDir = path.join(process.cwd(), 'uploads', 'library');
if (!fs.existsSync(uploadDir))
    fs.mkdirSync(uploadDir, { recursive: true });
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
const storage = multer.diskStorage({
    destination: (req, _file, cb) => {
        const projectId = req.params.projectId;
        const dir = path.join(uploadDir, projectId ?? 'temp');
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname) || '.bin';
        cb(null, `${crypto.randomUUID()}${ext}`);
    },
});
const upload = multer({
    storage,
    limits: { fileSize: LIBRARY_MAX_SIZE },
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_TYPES.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: PDF, images, DWG, DOC, XLS`));
        }
    },
});
export const libraryRouter = Router();
// GET /api/projects/:projectId/files
libraryRouter.get('/projects/:projectId/files', requireAuth, (req, res) => {
    const { projectId } = req.params;
    const search = req.query.search?.trim();
    const fileType = req.query.fileType?.trim();
    const archivedFilter = req.query.archived; // 'true' | 'false' | 'all'
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
    if (!project)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Project not found' });
    let where = 'f.project_id = ?';
    const params = [projectId];
    if (archivedFilter === 'false' || !archivedFilter) {
        where += ' AND f.is_archived = 0';
    }
    else if (archivedFilter === 'true') {
        where += ' AND f.is_archived = 1';
    }
    if (search) {
        where += ' AND f.filename LIKE ?';
        params.push(`%${search}%`);
    }
    if (fileType) {
        where += ' AND f.filetype LIKE ?';
        params.push(`%${fileType}%`);
    }
    const rows = db.prepare(`SELECT f.id, f.project_id, f.filename, f.filepath, f.filetype, f.size, f.uploader_id, f.uploaded_at,
            f.current_version_id, f.is_archived, f.thumbnail_url, f.scan_status, f.preview_url,
            v.version_number as current_version
     FROM library_files f
     LEFT JOIN library_file_versions v ON f.current_version_id = v.id
     WHERE ${where}
     ORDER BY f.uploaded_at DESC`).all(...params);
    const files = rows.map((r) => {
        const base = (UPLOAD_BASE || '/uploads').replace(/\/$/, '');
        const thumbUrl = r.thumbnail_url ?? (r.filetype?.startsWith('image/')
            ? `${base}/library/${r.project_id}/${path.basename(r.filepath)}`
            : null);
        return {
            id: r.id,
            projectId: r.project_id,
            filename: r.filename,
            filepath: r.filepath,
            filetype: r.filetype,
            size: r.size,
            uploaderId: r.uploader_id,
            uploadedAt: r.uploaded_at,
            currentVersionId: r.current_version_id,
            currentVersion: r.current_version ?? 1,
            isArchived: !!r.is_archived,
            thumbnailUrl: thumbUrl,
            scanStatus: r.scan_status ?? 'CLEAN',
            previewUrl: r.preview_url ?? undefined,
            downloadUrl: `/api/projects/${projectId}/files/${r.id}/download`,
        };
    });
    res.json({ files });
});
// POST /api/projects/:projectId/files - upload
libraryRouter.post('/projects/:projectId/files', requireAuth, upload.single('file'), (req, res) => {
    const userId = req.userId;
    const { projectId } = req.params;
    const file = req.file;
    if (!file) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'No file uploaded' });
    }
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
    if (!project)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Project not found' });
    const fileId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const now = new Date().toISOString();
    const relPath = `library/${projectId}/${file.filename}`;
    db.prepare(`INSERT INTO library_file_versions (id, file_id, version_number, filepath, size, uploaded_at, uploader_id, notes)
       VALUES (?, ?, 1, ?, ?, ?, ?, ?)`).run(versionId, fileId, relPath, file.size, now, userId, 'Initial upload');
    try {
        db.prepare(`INSERT INTO library_files (id, project_id, filename, filepath, filetype, size, uploader_id, uploaded_at, current_version_id, is_archived, scan_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'CLEAN')`).run(fileId, projectId, file.originalname, relPath, file.mimetype, file.size, userId, now, versionId);
    }
    catch (e) {
        if (String(e).includes('no such column: scan_status')) {
            db.prepare(`INSERT INTO library_files (id, project_id, filename, filepath, filetype, size, uploader_id, uploaded_at, current_version_id, is_archived)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`).run(fileId, projectId, file.originalname, relPath, file.mimetype, file.size, userId, now, versionId);
        }
        else
            throw e;
    }
    const thumbUrl = file.mimetype.startsWith('image/')
        ? `/uploads/library/${projectId}/${file.filename}`
        : null;
    if (thumbUrl) {
        db.prepare('UPDATE library_files SET thumbnail_url = ? WHERE id = ?').run(thumbUrl, fileId);
    }
    res.status(201).json({
        id: fileId,
        filename: file.originalname,
        filetype: file.mimetype,
        size: file.size,
        uploadedAt: now,
        currentVersion: 1,
        thumbnailUrl: thumbUrl,
    });
});
// GET /api/projects/:projectId/files/:fileId
libraryRouter.get('/projects/:projectId/files/:fileId', requireAuth, (req, res) => {
    const { projectId, fileId } = req.params;
    const row = db.prepare('SELECT * FROM library_files WHERE id = ? AND project_id = ?').get(fileId, projectId);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'File not found' });
    const version = db.prepare('SELECT version_number FROM library_file_versions WHERE id = ?').get(row.current_version_id);
    res.json({
        id: row.id,
        projectId: row.project_id,
        filename: row.filename,
        filepath: row.filepath,
        filetype: row.filetype,
        size: row.size,
        uploaderId: row.uploader_id,
        uploadedAt: row.uploaded_at,
        currentVersionId: row.current_version_id,
        currentVersion: version?.version_number ?? 1,
        isArchived: !!row.is_archived,
        thumbnailUrl: row.thumbnail_url,
        scanStatus: row.scan_status ?? 'CLEAN',
        previewUrl: row.preview_url ?? undefined,
    });
});
// PUT /api/projects/:projectId/files/:fileId - soft delete / archive
libraryRouter.put('/projects/:projectId/files/:fileId', requireAuth, (req, res) => {
    const { projectId, fileId } = req.params;
    const { isArchived } = req.body;
    const row = db.prepare('SELECT id FROM library_files WHERE id = ? AND project_id = ?').get(fileId, projectId);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'File not found' });
    const now = new Date().toISOString();
    if (isArchived !== undefined) {
        db.prepare('UPDATE library_files SET is_archived = ?, updated_at = ? WHERE id = ?').run(isArchived ? 1 : 0, now, fileId);
    }
    res.json({ id: fileId, isArchived: !!isArchived });
});
// POST /api/projects/:projectId/files/:fileId/restore - unarchive file
libraryRouter.post('/projects/:projectId/files/:fileId/restore', requireAuth, (req, res) => {
    const { projectId, fileId } = req.params;
    const row = db.prepare('SELECT id FROM library_files WHERE id = ? AND project_id = ?').get(fileId, projectId);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'File not found' });
    const now = new Date().toISOString();
    db.prepare('UPDATE library_files SET is_archived = 0, updated_at = ? WHERE id = ?').run(now, fileId);
    res.json({ id: fileId, restored: true, isArchived: false });
});
// POST /api/projects/:projectId/files/:fileId/restore - restore archived file
libraryRouter.post('/projects/:projectId/files/:fileId/restore', requireAuth, (req, res) => {
    const { projectId, fileId } = req.params;
    const row = db.prepare('SELECT id, is_archived FROM library_files WHERE id = ? AND project_id = ?').get(fileId, projectId);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'File not found' });
    const file = row;
    if (!file.is_archived) {
        return res.status(400).json({ code: 'INVALID_STATE', message: 'File is not archived' });
    }
    const now = new Date().toISOString();
    db.prepare('UPDATE library_files SET is_archived = 0, updated_at = ? WHERE id = ?').run(now, fileId);
    res.json({ id: fileId, restored: true, isArchived: false });
});
// DELETE /api/projects/:projectId/files/:fileId - soft delete (sets deleted_at or is_archived)
libraryRouter.delete('/projects/:projectId/files/:fileId', requireAuth, (req, res) => {
    const { projectId, fileId } = req.params;
    const row = db.prepare('SELECT id FROM library_files WHERE id = ? AND project_id = ?').get(fileId, projectId);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'File not found' });
    const now = new Date().toISOString();
    try {
        db.prepare('UPDATE library_files SET deleted_at = ?, is_archived = 1, updated_at = ? WHERE id = ?').run(now, now, fileId);
    }
    catch (e) {
        if (String(e).includes('no such column')) {
            db.prepare('UPDATE library_files SET is_archived = 1, updated_at = ? WHERE id = ?').run(now, fileId);
        }
        else
            throw e;
    }
    res.json({ id: fileId, deleted: true });
});
// POST /api/projects/:projectId/files/:fileId/restore - restore soft-deleted/archived file
libraryRouter.post('/projects/:projectId/files/:fileId/restore', requireAuth, (req, res) => {
    const { projectId, fileId } = req.params;
    const row = db.prepare('SELECT id, deleted_at, is_archived FROM library_files WHERE id = ? AND project_id = ?').get(fileId, projectId);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'File not found' });
    const r = row;
    if (!r.deleted_at && !r.is_archived) {
        return res.json({ id: fileId, restored: true, message: 'File is already active' });
    }
    const now = new Date().toISOString();
    try {
        db.prepare('UPDATE library_files SET deleted_at = NULL, is_archived = 0, updated_at = ? WHERE id = ?').run(now, fileId);
    }
    catch (e) {
        if (String(e).includes('no such column')) {
            db.prepare('UPDATE library_files SET is_archived = 0, updated_at = ? WHERE id = ?').run(now, fileId);
        }
        else
            throw e;
    }
    res.json({ id: fileId, restored: true });
});
// GET /api/projects/:projectId/files/:fileId/versions
libraryRouter.get('/projects/:projectId/files/:fileId/versions', requireAuth, (req, res) => {
    const { projectId, fileId } = req.params;
    const file = db.prepare('SELECT id FROM library_files WHERE id = ? AND project_id = ?').get(fileId, projectId);
    if (!file)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'File not found' });
    const rows = db.prepare('SELECT id, file_id, version_number, filepath, size, uploaded_at, uploader_id, notes FROM library_file_versions WHERE file_id = ? ORDER BY version_number DESC').all(fileId);
    res.json({
        versions: rows.map((r) => ({
            id: r.id,
            fileId: r.file_id,
            versionNumber: r.version_number,
            filepath: r.filepath,
            size: r.size,
            uploadedAt: r.uploaded_at,
            uploaderId: r.uploader_id,
            notes: r.notes ?? undefined,
        })),
    });
});
// POST /api/projects/:projectId/files/:fileId/versions - create new version (re-upload)
libraryRouter.post('/projects/:projectId/files/:fileId/versions', requireAuth, upload.single('file'), (req, res) => {
    const userId = req.userId;
    const { projectId, fileId } = req.params;
    const file = req.file;
    const notes = req.body.notes?.trim();
    const libFile = db.prepare('SELECT id, current_version_id FROM library_files WHERE id = ? AND project_id = ?').get(fileId, projectId);
    if (!libFile)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'File not found' });
    if (!file)
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'No file uploaded' });
    const max = db.prepare('SELECT COALESCE(MAX(version_number), 0) + 1 as next FROM library_file_versions WHERE file_id = ?').get(fileId);
    const versionId = crypto.randomUUID();
    const now = new Date().toISOString();
    const relPath = `library/${projectId}/${file.filename}`;
    db.prepare(`INSERT INTO library_file_versions (id, file_id, version_number, filepath, size, uploaded_at, uploader_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(versionId, fileId, max.next, relPath, file.size, now, userId, notes ?? null);
    const thumbUrl = file.mimetype.startsWith('image/')
        ? `/uploads/library/${projectId}/${file.filename}`
        : null;
    db.prepare('UPDATE library_files SET current_version_id = ?, filepath = ?, size = ?, uploaded_at = ?, thumbnail_url = COALESCE(?, thumbnail_url), updated_at = ? WHERE id = ?').run(versionId, relPath, file.size, now, thumbUrl, now, fileId);
    res.status(201).json({
        id: versionId,
        versionNumber: max.next,
        uploadedAt: now,
    });
});
// POST /api/projects/:projectId/files/:fileId/versions/:versionId/restore
libraryRouter.post('/projects/:projectId/files/:fileId/versions/:versionId/restore', requireAuth, (req, res) => {
    const { projectId, fileId, versionId } = req.params;
    const file = db.prepare('SELECT id FROM library_files WHERE id = ? AND project_id = ?').get(fileId, projectId);
    if (!file)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'File not found' });
    const version = db.prepare('SELECT id, filepath, size FROM library_file_versions WHERE id = ? AND file_id = ?').get(versionId, fileId);
    if (!version)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Version not found' });
    const versionNum = db.prepare('SELECT version_number FROM library_file_versions WHERE id = ?').get(versionId);
    const now = new Date().toISOString();
    db.prepare('UPDATE library_files SET current_version_id = ?, filepath = ?, size = ?, updated_at = ? WHERE id = ?').run(versionId, version.filepath, version.size, now, fileId);
    res.json({ currentVersionId: versionId, versionNumber: versionNum.version_number });
});
// GET /api/projects/:projectId/decisions/:decisionId/attachments - list files attached to decision
libraryRouter.get('/projects/:projectId/decisions/:decisionId/attachments', requireAuth, (req, res) => {
    const { projectId, decisionId } = req.params;
    const decision = db.prepare('SELECT id FROM decisions WHERE id = ? AND project_id = ?').get(decisionId, projectId);
    if (!decision)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' });
    const rows = db.prepare(`SELECT a.id, a.file_id, a.decision_id, a.notes, a.attached_at,
            f.filename, f.filetype, f.size, f.thumbnail_url
     FROM library_file_attachments a
     JOIN library_files f ON f.id = a.file_id AND f.project_id = ?
     WHERE a.decision_id = ?
     ORDER BY a.attached_at DESC`).all(projectId, decisionId);
    const attachments = rows.map((r) => ({
        id: r.id,
        fileId: r.file_id,
        decisionId: r.decision_id,
        filename: r.filename,
        filetype: r.filetype,
        size: r.size,
        thumbnailUrl: r.thumbnail_url,
        notes: r.notes ?? undefined,
        attachedAt: r.attached_at,
        downloadUrl: `/api/projects/${projectId}/files/${r.file_id}/download`,
    }));
    res.json({ attachments });
});
// DELETE /api/projects/:projectId/decisions/:decisionId/attachments/:attachmentId
libraryRouter.delete('/projects/:projectId/decisions/:decisionId/attachments/:attachmentId', requireAuth, (req, res) => {
    const { projectId, decisionId, attachmentId } = req.params;
    const decision = db.prepare('SELECT id FROM decisions WHERE id = ? AND project_id = ?').get(decisionId, projectId);
    if (!decision)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' });
    const row = db.prepare(`SELECT a.id FROM library_file_attachments a
     JOIN library_files f ON f.id = a.file_id AND f.project_id = ?
     WHERE a.id = ? AND a.decision_id = ?`).get(projectId, attachmentId, decisionId);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Attachment not found' });
    db.prepare('DELETE FROM library_file_attachments WHERE id = ?').run(attachmentId);
    res.json({ id: attachmentId, detached: true });
});
// POST /api/projects/:projectId/decisions/:decisionId/attachments - attach file to decision by fileId
libraryRouter.post('/projects/:projectId/decisions/:decisionId/attachments', requireAuth, (req, res) => {
    const userId = req.userId;
    const { projectId, decisionId } = req.params;
    const { fileId, notes } = req.body;
    if (!fileId) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'fileId is required' });
    }
    const file = db.prepare('SELECT id FROM library_files WHERE id = ? AND project_id = ?').get(fileId, projectId);
    if (!file)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'File not found' });
    const decision = db.prepare('SELECT id FROM decisions WHERE id = ? AND project_id = ?').get(decisionId, projectId);
    if (!decision)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' });
    const existing = db.prepare('SELECT id FROM library_file_attachments WHERE file_id = ? AND decision_id = ?').get(fileId, decisionId);
    if (existing) {
        db.prepare('UPDATE library_file_attachments SET notes = ?, attached_at = datetime("now") WHERE id = ?').run(notes ?? null, existing.id);
        return res.json({ attached: true, attachmentId: existing.id });
    }
    const attachmentId = crypto.randomUUID();
    db.prepare('INSERT INTO library_file_attachments (id, file_id, decision_id, notes, attached_by) VALUES (?, ?, ?, ?, ?)').run(attachmentId, fileId, decisionId, notes ?? null, userId);
    res.status(201).json({ attachmentId, attached: true });
});
// POST /api/projects/:projectId/files/:fileId/attach
libraryRouter.post('/projects/:projectId/files/:fileId/attach', requireAuth, (req, res) => {
    const userId = req.userId;
    const { projectId, fileId } = req.params;
    const { decisionId, notes } = req.body;
    if (!decisionId) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'decisionId is required' });
    }
    const file = db.prepare('SELECT id FROM library_files WHERE id = ? AND project_id = ?').get(fileId, projectId);
    if (!file)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'File not found' });
    const decision = db.prepare('SELECT id FROM decisions WHERE id = ? AND project_id = ?').get(decisionId, projectId);
    if (!decision)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' });
    const existing = db.prepare('SELECT id FROM library_file_attachments WHERE file_id = ? AND decision_id = ?').get(fileId, decisionId);
    if (existing) {
        db.prepare('UPDATE library_file_attachments SET notes = ?, attached_at = datetime("now") WHERE id = ?').run(notes ?? null, existing.id);
        return res.json({ attached: true, attachmentId: existing.id });
    }
    const attachmentId = crypto.randomUUID();
    db.prepare('INSERT INTO library_file_attachments (id, file_id, decision_id, notes, attached_by) VALUES (?, ?, ?, ?, ?)').run(attachmentId, fileId, decisionId, notes ?? null, userId);
    res.status(201).json({ attachmentId, attached: true });
});
// GET /api/projects/:projectId/files/:fileId/download - serve file (download)
libraryRouter.get('/projects/:projectId/files/:fileId/download', requireAuth, (req, res) => {
    const { projectId, fileId } = req.params;
    const row = db.prepare('SELECT f.filepath, f.filename FROM library_files f WHERE f.id = ? AND f.project_id = ?').get(fileId, projectId);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'File not found' });
    const fullPath = path.join(process.cwd(), 'uploads', row.filepath);
    if (!fs.existsSync(fullPath))
        return res.status(404).json({ code: 'NOT_FOUND', message: 'File not found on disk' });
    res.download(fullPath, row.filename);
});
// GET /api/projects/:projectId/files/:fileId/preview - serve file inline for preview (images, PDFs)
libraryRouter.get('/projects/:projectId/files/:fileId/preview', requireAuth, (req, res) => {
    const { projectId, fileId } = req.params;
    const row = db.prepare('SELECT f.filepath, f.filename, f.filetype FROM library_files f WHERE f.id = ? AND f.project_id = ?').get(fileId, projectId);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'File not found' });
    const fullPath = path.join(process.cwd(), 'uploads', row.filepath);
    if (!fs.existsSync(fullPath))
        return res.status(404).json({ code: 'NOT_FOUND', message: 'File not found on disk' });
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.filename)}"`);
    if (row.filetype)
        res.setHeader('Content-Type', row.filetype);
    res.sendFile(fullPath);
});
