import { Router } from 'express';
import crypto from 'crypto';
import multer from 'multer';
import { db } from './db.js';
import { getUserIdFromAccessToken } from './auth-utils.js';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
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
const TEMPLATE_TYPES = ['FINISHES', 'LAYOUTS', 'CHANGE_REQUESTS', 'VARIATIONS', 'PERMITS'];
export const templatesRouter = Router();
// GET /api/templates - list with filters
templatesRouter.get('/templates', requireAuth, (req, res) => {
    const userId = req.userId;
    const projectId = req.query.projectId;
    const type = req.query.type;
    const q = req.query.q?.trim();
    const tags = req.query.tags;
    const archived = req.query.archived;
    const scope = req.query.scope; // 'my' | 'all'
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    let where = 't.is_deleted = 0';
    const params = [];
    if (archived === 'true') {
        where += ' AND t.is_archived = 1';
    }
    else if (archived !== 'all') {
        where += ' AND t.is_archived = 0';
    }
    if (projectId) {
        where += ' AND (t.project_id = ? OR t.project_id IS NULL)';
        params.push(projectId);
    }
    if (type && TEMPLATE_TYPES.includes(type)) {
        where += ' AND t.type = ?';
        params.push(type);
    }
    if (q) {
        where += ' AND (t.name LIKE ? OR t.description LIKE ? OR t.tags_json LIKE ?)';
        const like = `%${q}%`;
        params.push(like, like, like);
    }
    if (tags) {
        const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
        for (const tag of tagList) {
            where += ' AND t.tags_json LIKE ?';
            params.push(`%${tag}%`);
        }
    }
    if (scope === 'my') {
        where += ' AND t.owner_id = ?';
        params.push(userId);
    }
    const countRow = db.prepare(`SELECT COUNT(*) as c FROM templates_library t WHERE ${where}`).get(...params);
    const total = countRow.c;
    const rows = db.prepare(`SELECT t.id, t.name, t.description, t.type, t.content_json, t.tags_json, t.owner_id, t.project_id,
            t.version, t.created_at, t.updated_at, t.is_archived, t.reminder_schedule
     FROM templates_library t
     WHERE ${where}
     ORDER BY t.updated_at DESC
     LIMIT ? OFFSET ?`).all(...params, limit, offset);
    const applyCounts = new Map();
    if (rows.length > 0) {
        const ids = rows.map((r) => r.id);
        const placeholders = ids.map(() => '?').join(',');
        const counts = db.prepare(`SELECT template_id, COUNT(*) as c FROM project_template_apply_log WHERE template_id IN (${placeholders}) GROUP BY template_id`).all(...ids);
        counts.forEach((c) => applyCounts.set(c.template_id, c.c));
    }
    const items = rows.map((r) => {
        let tags = [];
        try {
            tags = r.tags_json ? JSON.parse(r.tags_json) : [];
        }
        catch {
            // ignore
        }
        let content = {};
        try {
            content = r.content_json ? JSON.parse(r.content_json) : {};
        }
        catch {
            // ignore
        }
        const defaultOptions = content.defaultOptions ?? [];
        return {
            id: r.id,
            name: r.name,
            description: r.description ?? '',
            type: r.type,
            content,
            tags,
            ownerId: r.owner_id,
            projectId: r.project_id,
            version: r.version,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            isArchived: !!r.is_archived,
            reminderSchedule: r.reminder_schedule,
            usageCount: applyCounts.get(r.id) ?? 0,
            optionCount: defaultOptions.length,
        };
    });
    res.json({ items, total, page, limit });
});
// POST /api/templates/import - must be before :id (supports file upload or JSON body)
templatesRouter.post('/templates/import', requireAuth, upload.single('file'), (req, res) => {
    const userId = req.userId;
    const file = req.file;
    let templates;
    if (file?.buffer) {
        try {
            const text = file.buffer.toString('utf-8');
            const data = JSON.parse(text);
            templates = Array.isArray(data)
                ? data
                : data.templates
                    ? data.templates
                    : [data];
        }
        catch {
            return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Invalid JSON file' });
        }
    }
    else {
        const body = req.body;
        templates = body.templates ?? (Array.isArray(body) ? body : [body]);
    }
    if (!Array.isArray(templates) || templates.length === 0) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'templates array is required' });
    }
    const now = new Date().toISOString();
    const results = [];
    const errors = [];
    for (const t of templates) {
        if (!t.name?.trim()) {
            errors.push('Template missing name');
            continue;
        }
        const id = crypto.randomUUID();
        const type = t.type && TEMPLATE_TYPES.includes(t.type) ? t.type : 'FINISHES';
        const contentJson = t.content ? JSON.stringify(t.content) : '{}';
        const tagsJson = t.tags ? JSON.stringify(t.tags) : '[]';
        try {
            db.prepare(`INSERT INTO templates_library (id, name, description, type, content_json, tags_json, owner_id, version, created_at, updated_at, is_archived, is_deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 0, 0)`).run(id, t.name.trim(), t.description?.trim() ?? null, type, contentJson, tagsJson, userId, now, now);
            const versionId = crypto.randomUUID();
            db.prepare('INSERT INTO templates_library_versions (id, template_id, version_number, created_at, changes_summary, content_snapshot) VALUES (?, ?, 1, ?, ?, ?)').run(versionId, id, now, 'Imported', contentJson);
            results.push({ id, name: t.name.trim(), status: 'created' });
        }
        catch (e) {
            errors.push(`${t.name}: ${String(e)}`);
        }
    }
    res.status(201).json({ imported: results.length, templates: results, errors: errors.length > 0 ? errors : undefined });
});
// POST /api/templates/export - must be before :id (returns JSON file download)
templatesRouter.post('/templates/export', requireAuth, (req, res) => {
    const { templateIds } = req.body;
    if (!templateIds?.length) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'templateIds array is required' });
    }
    const placeholders = templateIds.map(() => '?').join(',');
    const rows = db.prepare(`SELECT id, name, description, type, content_json, tags_json, reminder_schedule FROM templates_library WHERE id IN (${placeholders}) AND is_deleted = 0`).all(...templateIds);
    const exportData = rows.map((r) => {
        let content = {};
        let tags = [];
        try {
            content = r.content_json ? JSON.parse(r.content_json) : {};
        }
        catch {
            // ignore
        }
        try {
            tags = r.tags_json ? JSON.parse(r.tags_json) : [];
        }
        catch {
            // ignore
        }
        return {
            id: r.id,
            name: r.name,
            description: r.description ?? '',
            type: r.type,
            content,
            tags,
            reminderSchedule: r.reminder_schedule,
        };
    });
    const payload = { templates: exportData, exportedAt: new Date().toISOString() };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="templates-export.json"');
    res.send(JSON.stringify(payload, null, 2));
});
// POST /api/templates/:id/export - single template export (must be before GET :id)
templatesRouter.post('/templates/:id/export', requireAuth, (req, res) => {
    const { id } = req.params;
    const row = db.prepare('SELECT id, name, description, type, content_json, tags_json, reminder_schedule FROM templates_library WHERE id = ? AND is_deleted = 0').get(id);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Template not found' });
    let content = {};
    let tags = [];
    try {
        content = row.content_json ? JSON.parse(row.content_json) : {};
    }
    catch {
        // ignore
    }
    try {
        tags = row.tags_json ? JSON.parse(row.tags_json) : [];
    }
    catch {
        // ignore
    }
    const exportData = {
        id,
        name: row.name,
        description: row.description ?? '',
        type: row.type,
        content,
        tags,
        reminderSchedule: row.reminder_schedule,
        exportedAt: new Date().toISOString(),
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${row.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.json"`);
    res.send(JSON.stringify(exportData, null, 2));
});
// GET /api/templates/:id - detail with version history
templatesRouter.get('/templates/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const row = db.prepare('SELECT * FROM templates_library WHERE id = ? AND is_deleted = 0').get(id);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Template not found' });
    const usageCount = db.prepare('SELECT COUNT(*) as c FROM project_template_apply_log WHERE template_id = ?').get(id);
    let tags = [];
    try {
        tags = row.tags_json ? JSON.parse(row.tags_json) : [];
    }
    catch {
        // ignore
    }
    let content = {};
    try {
        content = row.content_json ? JSON.parse(row.content_json) : {};
    }
    catch {
        // ignore
    }
    const versions = db.prepare('SELECT id, version_number, created_at, changes_summary, content_snapshot FROM templates_library_versions WHERE template_id = ? ORDER BY version_number DESC').all(id);
    res.json({
        id: row.id,
        name: row.name,
        description: row.description ?? '',
        type: row.type,
        content,
        tags,
        ownerId: row.owner_id,
        projectId: row.project_id,
        version: row.version,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        isArchived: !!row.is_archived,
        reminderSchedule: row.reminder_schedule,
        usageCount: usageCount.c,
        versions: versions.map((v) => ({
            id: v.id,
            versionNumber: v.version_number,
            createdAt: v.created_at,
            changesSummary: v.changes_summary ?? '',
            contentSnapshot: v.content_snapshot ? JSON.parse(v.content_snapshot) : null,
        })),
    });
});
// POST /api/templates - create
templatesRouter.post('/templates', requireAuth, (req, res) => {
    const userId = req.userId;
    const { name, description, type, content, tags, projectId, reminderSchedule } = req.body;
    if (!name?.trim()) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Name is required' });
    }
    const templateType = type && TEMPLATE_TYPES.includes(type)
        ? type
        : 'FINISHES';
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const contentJson = content ? JSON.stringify(content) : '{}';
    const tagsJson = tags ? JSON.stringify(tags) : '[]';
    db.prepare(`INSERT INTO templates_library (id, name, description, type, content_json, tags_json, owner_id, project_id, version, created_at, updated_at, is_archived, is_deleted, reminder_schedule)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 0, 0, ?)`).run(id, name.trim(), description?.trim() ?? null, templateType, contentJson, tagsJson, userId, projectId ?? null, now, now, reminderSchedule ?? null);
    const versionId = crypto.randomUUID();
    db.prepare('INSERT INTO templates_library_versions (id, template_id, version_number, created_at, changes_summary, content_snapshot) VALUES (?, ?, 1, ?, ?, ?)').run(versionId, id, now, 'Initial version', contentJson);
    res.status(201).json({
        id,
        name: name.trim(),
        description: description?.trim() ?? '',
        type: templateType,
        content: content ?? {},
        tags: tags ?? [],
        ownerId: userId,
        projectId: projectId ?? null,
        version: 1,
        createdAt: now,
        updatedAt: now,
        isArchived: false,
        reminderSchedule: reminderSchedule ?? null,
        usageCount: 0,
    });
});
// PUT /api/templates/:id - update (creates new version)
templatesRouter.put('/templates/:id', requireAuth, (req, res) => {
    const userId = req.userId;
    const { id } = req.params;
    const { name, description, type, content, tags, reminderSchedule, versionNote } = req.body;
    const row = db.prepare('SELECT * FROM templates_library WHERE id = ? AND is_deleted = 0').get(id);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Template not found' });
    if (row.owner_id !== userId) {
        return res.status(403).json({ code: 'FORBIDDEN', message: 'Not authorized to edit this template' });
    }
    const templateType = type && TEMPLATE_TYPES.includes(type)
        ? type
        : row.type;
    const contentJson = content ? JSON.stringify(content) : row.content_json;
    const tagsJson = tags ? JSON.stringify(tags) : row.tags_json;
    const now = new Date().toISOString();
    const newVersion = row.version + 1;
    db.prepare(`UPDATE templates_library SET name = ?, description = ?, type = ?, content_json = ?, tags_json = ?, version = ?, updated_at = ?, reminder_schedule = ?
     WHERE id = ?`).run(name?.trim() ?? row.name, description?.trim() ?? row.description ?? null, templateType, contentJson, tagsJson, newVersion, now, reminderSchedule ?? row.reminder_schedule ?? null, id);
    const versionId = crypto.randomUUID();
    db.prepare('INSERT INTO templates_library_versions (id, template_id, version_number, created_at, changes_summary, content_snapshot) VALUES (?, ?, ?, ?, ?, ?)').run(versionId, id, newVersion, now, versionNote ?? 'Updated', contentJson);
    res.json({
        id,
        version: newVersion,
        updatedAt: now,
    });
});
// PATCH /api/templates/:id - partial update (archive/restore)
templatesRouter.patch('/templates/:id', requireAuth, (req, res) => {
    const userId = req.userId;
    const { id } = req.params;
    const { isArchived } = req.body;
    const row = db.prepare('SELECT owner_id FROM templates_library WHERE id = ? AND is_deleted = 0').get(id);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Template not found' });
    if (row.owner_id !== userId) {
        return res.status(403).json({ code: 'FORBIDDEN', message: 'Not authorized' });
    }
    const now = new Date().toISOString();
    if (isArchived !== undefined) {
        db.prepare('UPDATE templates_library SET is_archived = ?, updated_at = ? WHERE id = ?').run(isArchived ? 1 : 0, now, id);
    }
    res.json({ id, isArchived: !!isArchived, updatedAt: now });
});
// DELETE /api/templates/:id - soft delete
templatesRouter.delete('/templates/:id', requireAuth, (req, res) => {
    const userId = req.userId;
    const { id } = req.params;
    const row = db.prepare('SELECT owner_id FROM templates_library WHERE id = ?').get(id);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Template not found' });
    if (row.owner_id !== userId) {
        return res.status(403).json({ code: 'FORBIDDEN', message: 'Not authorized' });
    }
    const now = new Date().toISOString();
    db.prepare('UPDATE templates_library SET is_deleted = 1, is_archived = 1, updated_at = ? WHERE id = ?').run(now, id);
    res.json({ id, deleted: true });
});
// POST /api/templates/:id/restore - restore soft-deleted template
templatesRouter.post('/templates/:id/restore', requireAuth, (req, res) => {
    const userId = req.userId;
    const { id } = req.params;
    const row = db.prepare('SELECT owner_id, is_deleted FROM templates_library WHERE id = ?').get(id);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Template not found' });
    if (row.owner_id !== userId) {
        return res.status(403).json({ code: 'FORBIDDEN', message: 'Not authorized' });
    }
    if (!row.is_deleted) {
        return res.json({ id, restored: true, message: 'Template is already active' });
    }
    const now = new Date().toISOString();
    db.prepare('UPDATE templates_library SET is_deleted = 0, is_archived = 0, updated_at = ? WHERE id = ?').run(now, id);
    const restored = db.prepare('SELECT id, name, description, type, version, created_at, updated_at FROM templates_library WHERE id = ?').get(id);
    res.json({
        id: restored.id,
        name: restored.name,
        description: restored.description ?? '',
        type: restored.type,
        version: restored.version,
        createdAt: restored.created_at,
        updatedAt: restored.updated_at,
        restored: true,
    });
});
// POST /api/templates/:id/duplicate - clone
templatesRouter.post('/templates/:id/duplicate', requireAuth, (req, res) => {
    const userId = req.userId;
    const { id } = req.params;
    const { projectId } = req.body;
    const row = db.prepare('SELECT * FROM templates_library WHERE id = ? AND is_deleted = 0').get(id);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Template not found' });
    const newId = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO templates_library (id, name, description, type, content_json, tags_json, owner_id, project_id, version, created_at, updated_at, is_archived, is_deleted, reminder_schedule)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 0, 0, ?)`).run(newId, `${row.name} (copy)`, row.description, row.type, row.content_json, row.tags_json, userId, projectId ?? row.project_id, now, now, row.reminder_schedule);
    const versionId = crypto.randomUUID();
    db.prepare('INSERT INTO templates_library_versions (id, template_id, version_number, created_at, changes_summary, content_snapshot) VALUES (?, ?, 1, ?, ?, ?)').run(versionId, newId, now, 'Duplicated', row.content_json);
    res.status(201).json({
        id: newId,
        name: `${row.name} (copy)`,
        version: 1,
        createdAt: now,
    });
});
// GET /api/templates/:id/versions
templatesRouter.get('/templates/:id/versions', requireAuth, (req, res) => {
    const { id } = req.params;
    const template = db.prepare('SELECT id FROM templates_library WHERE id = ? AND is_deleted = 0').get(id);
    if (!template)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Template not found' });
    const rows = db.prepare('SELECT id, version_number, created_at, changes_summary, content_snapshot FROM templates_library_versions WHERE template_id = ? ORDER BY version_number DESC').all(id);
    res.json({
        versions: rows.map((v) => ({
            id: v.id,
            versionNumber: v.version_number,
            createdAt: v.created_at,
            changesSummary: v.changes_summary ?? '',
            contentSnapshot: v.content_snapshot ? JSON.parse(v.content_snapshot) : null,
        })),
    });
});
// POST /api/templates/:id/versions/:versionId/restore
templatesRouter.post('/templates/:id/versions/:versionId/restore', requireAuth, (req, res) => {
    const userId = req.userId;
    const { id, versionId } = req.params;
    const template = db.prepare('SELECT owner_id FROM templates_library WHERE id = ? AND is_deleted = 0').get(id);
    if (!template)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Template not found' });
    if (template.owner_id !== userId) {
        return res.status(403).json({ code: 'FORBIDDEN', message: 'Not authorized' });
    }
    const version = db.prepare('SELECT content_snapshot FROM templates_library_versions WHERE id = ? AND template_id = ?').get(versionId, id);
    if (!version)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Version not found' });
    const now = new Date().toISOString();
    const maxVersion = db.prepare('SELECT COALESCE(MAX(version_number), 0) + 1 as next FROM templates_library_versions WHERE template_id = ?').get(id);
    db.prepare('UPDATE templates_library SET content_json = ?, version = ?, updated_at = ? WHERE id = ?').run(version.content_snapshot, maxVersion.next, now, id);
    const newVersionId = crypto.randomUUID();
    db.prepare('INSERT INTO templates_library_versions (id, template_id, version_number, created_at, changes_summary, content_snapshot) VALUES (?, ?, ?, ?, ?, ?)').run(newVersionId, id, maxVersion.next, now, 'Restored from previous version', version.content_snapshot);
    res.json({
        id,
        version: maxVersion.next,
        updatedAt: now,
    });
});
// POST /api/projects/:projectId/apply-template
templatesRouter.post('/projects/:projectId/apply-template', requireAuth, (req, res) => {
    const userId = req.userId;
    const { projectId } = req.params;
    const { templateId, targetDecisions, scopeDetail } = req.body;
    if (!templateId) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'templateId is required' });
    }
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
    if (!project)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Project not found' });
    const template = db.prepare('SELECT id, name, content_json FROM templates_library WHERE id = ? AND is_deleted = 0 AND is_archived = 0').get(templateId);
    if (!template)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Template not found' });
    let content = {};
    try {
        content = JSON.parse(template.content_json);
    }
    catch {
        // ignore
    }
    const defaultOptions = content.defaultOptions ?? [];
    const now = new Date().toISOString();
    const decisionId = crypto.randomUUID();
    db.prepare(`INSERT INTO decisions (id, project_id, account_id, title, type, status, created_at, updated_at, created_by)
     VALUES (?, ?, ?, ?, 'finishes', 'draft', ?, ?, ?)`).run(decisionId, projectId, userId, template.name, now, now, userId);
    for (let i = 0; i < defaultOptions.length; i++) {
        const opt = defaultOptions[i];
        const optId = crypto.randomUUID();
        db.prepare(`INSERT INTO decision_options (id, decision_id, title, description, is_default, is_recommended, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`).run(optId, decisionId, opt.title, opt.description ?? null, opt.isDefault ? 1 : 0, opt.isRecommended ? 1 : 0, i);
    }
    const logId = crypto.randomUUID();
    db.prepare('INSERT INTO project_template_apply_log (id, project_id, template_id, applied_at, applied_by, scope_detail, result) VALUES (?, ?, ?, ?, ?, ?, ?)').run(logId, projectId, templateId, now, userId, scopeDetail ? JSON.stringify(scopeDetail) : null, 'success');
    res.status(201).json({
        decisionId,
        decisionsCreated: 1,
        applied: true,
        logId,
        scopeDetail: scopeDetail ?? { targetDecisions: targetDecisions ?? [] },
    });
});
