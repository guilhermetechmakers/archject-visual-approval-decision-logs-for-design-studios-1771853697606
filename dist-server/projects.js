import { Router } from 'express';
import crypto from 'crypto';
import { db } from './db.js';
import { getUserIdFromAccessToken } from './auth-utils.js';
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
export const projectsRouter = Router();
// GET /api/projects - list projects (exclude soft-deleted)
projectsRouter.get('/projects', requireAuth, (req, res) => {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize || '12', 10)));
    const search = req.query.search?.trim();
    const includeDeleted = req.query.includeDeleted === 'true';
    let where = 'deleted_at IS NULL';
    if (includeDeleted)
        where = '1=1';
    const params = [];
    if (search && !includeDeleted) {
        where += ' AND name LIKE ?';
        params.push(`%${search}%`);
    }
    if (search && includeDeleted) {
        where += ' AND name LIKE ?';
        params.push(`%${search}%`);
    }
    const countRow = db.prepare(`SELECT COUNT(*) as c FROM projects WHERE ${where}`).get(...params);
    const total = countRow?.c ?? 0;
    const rows = db.prepare(`SELECT id, name, description, created_at, updated_at, deleted_at FROM projects
     WHERE ${where}
     ORDER BY updated_at DESC
     LIMIT ? OFFSET ?`).all(...params, pageSize, (page - 1) * pageSize);
    const pendingByProject = db.prepare(`SELECT project_id, COUNT(*) as count FROM decisions
     WHERE deleted_at IS NULL AND status IN ('pending', 'in_review') GROUP BY project_id`).all();
    const pendingMap = Object.fromEntries(pendingByProject.map((p) => [p.project_id, p.count]));
    res.json({
        items: rows.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description ?? '',
            status: p.deleted_at ? 'archived' : 'active',
            createdAt: p.created_at,
            updatedAt: p.updated_at,
            deletedAt: p.deleted_at ?? undefined,
            pendingApprovalsCount: pendingMap[p.id] ?? 0,
        })),
        total,
        page,
        pageSize,
    });
});
// POST /api/projects - create project
projectsRouter.post('/projects', requireAuth, (req, res) => {
    const userId = req.userId;
    const { name, description } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Project name is required' });
        return;
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO projects (id, name, description, account_id, studio_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, name.trim(), description?.trim() ?? null, userId, 'default', now, now);
    res.status(201).json({
        id,
        name: name.trim(),
        description: description?.trim() ?? '',
        status: 'active',
        createdAt: now,
        updatedAt: now,
        pendingApprovalsCount: 0,
    });
});
// GET /api/projects/:id - get single project
projectsRouter.get('/projects/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const includeDeleted = req.query.includeDeleted === 'true';
    const row = db.prepare('SELECT id, name, description, created_at, updated_at, deleted_at FROM projects WHERE id = ?').get(id);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Project not found' });
    if (row.deleted_at && !includeDeleted)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Project not found' });
    const pendingCount = db.prepare(`SELECT COUNT(*) as c FROM decisions WHERE project_id = ? AND deleted_at IS NULL AND status IN ('pending', 'in_review')`).get(id);
    res.json({
        id: row.id,
        name: row.name,
        description: row.description ?? '',
        status: row.deleted_at ? 'archived' : 'active',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        deletedAt: row.deleted_at ?? undefined,
        pendingApprovalsCount: pendingCount?.c ?? 0,
    });
});
// PATCH /api/projects/:id - update project
projectsRouter.patch('/projects/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    const row = db.prepare('SELECT id, deleted_at FROM projects WHERE id = ?').get(id);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Project not found' });
    if (row.deleted_at) {
        return res.status(400).json({ code: 'INVALID_STATE', message: 'Cannot update archived project' });
    }
    const now = new Date().toISOString();
    const updates = [];
    const params = [];
    if (name !== undefined && typeof name === 'string') {
        if (!name.trim()) {
            return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Project name cannot be empty' });
        }
        updates.push('name = ?');
        params.push(name.trim());
    }
    if (description !== undefined) {
        updates.push('description = ?');
        params.push(description?.trim() ?? null);
    }
    if (updates.length > 0) {
        updates.push('updated_at = ?');
        params.push(now);
        params.push(id);
        db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }
    const updated = db.prepare('SELECT id, name, description, created_at, updated_at FROM projects WHERE id = ?').get(id);
    res.json({
        id: updated.id,
        name: updated.name,
        description: updated.description ?? '',
        status: 'active',
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
    });
});
// DELETE /api/projects/:id - soft delete
projectsRouter.delete('/projects/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const row = db.prepare('SELECT id, deleted_at FROM projects WHERE id = ?').get(id);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Project not found' });
    if (row.deleted_at) {
        return res.json({ id, deleted: true, message: 'Already archived' });
    }
    const now = new Date().toISOString();
    db.prepare('UPDATE projects SET deleted_at = ?, updated_at = ? WHERE id = ?').run(now, now, id);
    res.json({ id, deleted: true });
});
// POST /api/projects/:id/restore - restore soft-deleted project
projectsRouter.post('/projects/:id/restore', requireAuth, (req, res) => {
    const { id } = req.params;
    const row = db.prepare('SELECT id, deleted_at FROM projects WHERE id = ?').get(id);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Project not found' });
    if (!row.deleted_at) {
        return res.json({ id, restored: true, message: 'Project is already active' });
    }
    const now = new Date().toISOString();
    db.prepare('UPDATE projects SET deleted_at = NULL, updated_at = ? WHERE id = ?').run(now, id);
    const restored = db.prepare('SELECT id, name, description, created_at, updated_at FROM projects WHERE id = ?').get(id);
    res.json({
        id: restored.id,
        name: restored.name,
        description: restored.description ?? '',
        status: 'active',
        createdAt: restored.created_at,
        updatedAt: restored.updated_at,
        restored: true,
    });
});
