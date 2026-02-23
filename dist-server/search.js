import { Router } from 'express';
import crypto from 'crypto';
import { db } from './db.js';
import { getUserIdFromAccessToken } from './auth-utils.js';
const CONTENT_TYPES = ['project', 'decision', 'template', 'file'];
const STATUS_VALUES = ['pending', 'in_review', 'approved', 'declined', 're_requested', 'active', 'published'];
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
function buildSearchWhere(query, filters) {
    const conditions = ['1=1'];
    const params = [];
    if (query && query.trim().length >= 2) {
        const terms = query.trim().split(/\s+/).filter(Boolean);
        const likeClauses = terms.map((t) => {
            const pattern = `%${t}%`;
            params.push(pattern, pattern, pattern);
            return '(title LIKE ? OR content LIKE ? OR snippet LIKE ?)';
        });
        if (likeClauses.length) {
            conditions.push(`(${likeClauses.join(' OR ')})`);
        }
    }
    if (filters?.content_types?.length) {
        const placeholders = filters.content_types.map(() => '?').join(',');
        conditions.push(`type IN (${placeholders})`);
        params.push(...filters.content_types);
    }
    if (filters?.status?.length) {
        const placeholders = filters.status.map(() => '?').join(',');
        conditions.push(`status IN (${placeholders})`);
        params.push(...filters.status);
    }
    if (filters?.assignees?.length) {
        const placeholders = filters.assignees.map(() => '?').join(',');
        conditions.push(`assignee_id IN (${placeholders})`);
        params.push(...filters.assignees);
    }
    if (filters?.projects?.length) {
        const placeholders = filters.projects.map(() => '?').join(',');
        conditions.push(`project_id IN (${placeholders})`);
        params.push(...filters.projects);
    }
    if (filters?.tags?.length) {
        const tagConditions = filters.tags.map((tag) => {
            params.push(`%${tag}%`);
            return 'tags LIKE ?';
        });
        conditions.push(`(${tagConditions.join(' OR ')})`);
    }
    if (filters?.dateRange?.from) {
        conditions.push('created_at >= ?');
        params.push(filters.dateRange.from);
    }
    if (filters?.dateRange?.to) {
        conditions.push('created_at <= ?');
        params.push(filters.dateRange.to);
    }
    return { where: conditions.join(' AND '), params };
}
function highlightMatch(text, query) {
    if (!query || !text)
        return text;
    const terms = query.trim().split(/\s+/).filter(Boolean);
    let result = text;
    for (const term of terms) {
        const re = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        result = result.replace(re, '<mark>$1</mark>');
    }
    return result;
}
export const searchRouter = Router();
/**
 * POST /api/search/query
 */
searchRouter.post('/query', requireAuth, (req, res) => {
    const userId = req.userId;
    const body = req.body;
    const page = Math.max(1, body.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, body.pageSize ?? 2));
    const sortField = body.sort?.field ?? 'updated_at';
    const sortOrder = body.sort?.order === 'asc' ? 'ASC' : 'DESC';
    const validSort = ['title', 'created_at', 'updated_at', 'status'].includes(sortField)
        ? sortField
        : 'updated_at';
    const { where, params } = buildSearchWhere(body.query, body.filters ?? {});
    const countRow = db.prepare(`SELECT COUNT(*) as c FROM search_index WHERE ${where}`).get(...params);
    const total = countRow?.c ?? 0;
    const rows = db.prepare(`SELECT id, document_id, type, title, snippet, content, project_id, status, assignee_id, tags, created_at, updated_at
     FROM search_index
     WHERE ${where}
     ORDER BY ${validSort} ${sortOrder}
     LIMIT ? OFFSET ?`).all(...params, pageSize, (page - 1) * pageSize);
    const projectNames = new Map();
    const projectIds = [...new Set(rows.map((r) => r.project_id).filter(Boolean))];
    if (projectIds.length) {
        const projects = db.prepare(`SELECT id, name FROM projects WHERE id IN (${projectIds.map(() => '?').join(',')})`).all(...projectIds);
        for (const p of projects)
            projectNames.set(p.id, p.name);
    }
    const assigneeNames = new Map();
    const assigneeIds = [...new Set(rows.map((r) => r.assignee_id).filter(Boolean))];
    if (assigneeIds.length) {
        const users = db.prepare(`SELECT id, first_name, last_name FROM users WHERE id IN (${assigneeIds.map(() => '?').join(',')})`).all(...assigneeIds);
        for (const u of users)
            assigneeNames.set(u.id, `${u.first_name} ${u.last_name}`.trim());
    }
    const query = body.query ?? '';
    const results = rows.map((r) => ({
        id: r.document_id,
        type: r.type,
        title: r.title,
        snippet: r.snippet ?? r.title,
        project: r.project_id ? { id: r.project_id, name: projectNames.get(r.project_id) ?? r.project_id } : null,
        status: r.status,
        assignee: r.assignee_id ? { id: r.assignee_id, name: assigneeNames.get(r.assignee_id) ?? r.assignee_id } : null,
        date: r.updated_at ?? r.created_at,
        highlights: {
            title: highlightMatch(r.title, query),
            snippet: highlightMatch(r.snippet ?? r.title, query),
        },
    }));
    res.json({ total, page, pageSize, results });
});
/**
 * GET /api/search/autocomplete
 */
searchRouter.get('/autocomplete', requireAuth, (req, res) => {
    const q = req.query.q?.trim();
    const contentTypes = req.query.content_types;
    const types = Array.isArray(contentTypes) ? contentTypes : contentTypes ? [contentTypes] : [];
    if (!q || q.length < 2) {
        return res.json({ suggestions: [], topHits: [] });
    }
    let where = `(title LIKE ? OR content LIKE ?)`;
    const params = [`%${q}%`, `%${q}%`];
    if (types.length) {
        where += ` AND type IN (${types.map(() => '?').join(',')})`;
        params.push(...types);
    }
    const rows = db.prepare(`SELECT document_id, type, title FROM search_index WHERE ${where} ORDER BY updated_at DESC LIMIT 10`).all(...params);
    const suggestions = [...new Set(rows.map((r) => r.title).slice(0, 5))];
    const topHits = rows.slice(0, 5).map((r) => ({ id: r.document_id, type: r.type, title: r.title }));
    res.json({ suggestions, topHits });
});
/**
 * POST /api/search/save
 */
searchRouter.post('/save', requireAuth, (req, res) => {
    const userId = req.userId;
    const { name, payload } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Name is required' });
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO saved_searches (id, user_id, name, payload, content_type, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, userId, name.trim(), JSON.stringify(payload ?? {}), null, now, now);
    res.status(201).json({ savedSearchId: id });
});
/**
 * GET /api/search/save/:id
 */
searchRouter.get('/save/:id', requireAuth, (req, res) => {
    const userId = req.userId;
    const { id } = req.params;
    const row = db.prepare('SELECT id, name, payload, content_type, created_at, updated_at FROM saved_searches WHERE id = ? AND user_id = ?').get(id, userId);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Saved search not found' });
    res.json({
        id: row.id,
        name: row.name,
        payload: JSON.parse(row.payload || '{}'),
        contentType: row.content_type,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    });
});
/**
 * GET /api/search/saved
 */
searchRouter.get('/saved', requireAuth, (req, res) => {
    const userId = req.userId;
    const rows = db.prepare('SELECT id, name, payload, content_type, created_at, updated_at, last_used_at FROM saved_searches WHERE user_id = ? ORDER BY updated_at DESC').all(userId);
    res.json({
        items: rows.map((r) => ({
            id: r.id,
            name: r.name,
            payload: JSON.parse(r.payload || '{}'),
            contentType: r.content_type,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            lastUsedAt: r.last_used_at,
        })),
    });
});
/**
 * POST /api/search/attach
 */
searchRouter.post('/attach', requireAuth, (req, res) => {
    const userId = req.userId;
    const { resultId, targetType, targetId } = req.body;
    if (!resultId || !targetType || !targetId) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'resultId, targetType, and targetId are required' });
    }
    const validTargets = ['decision', 'template', 'file'];
    if (!validTargets.includes(targetType)) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Invalid targetType' });
    }
    const row = db.prepare('SELECT document_id, type, project_id FROM search_index WHERE document_id = ?').get(resultId);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Search result not found' });
    if (targetType === 'decision' && row.type === 'file' && row.project_id) {
        const existing = db.prepare('SELECT COUNT(*) as c FROM library_file_attachments WHERE file_id = ? AND decision_id = ?').get(parseFileId(resultId), targetId);
        if (existing?.c > 0) {
            return res.json({ attached: true, message: 'Already attached' });
        }
        const attachId = crypto.randomUUID();
        db.prepare('INSERT INTO library_file_attachments (id, file_id, decision_id, attached_at, attached_by) VALUES (?, ?, ?, ?, ?)').run(attachId, resultId, targetId, new Date().toISOString(), userId);
        return res.json({ attached: true, attachmentId: attachId });
    }
    res.json({ attached: false, message: 'Attach not supported for this combination' });
});
function parseFileId(resultId) {
    return resultId;
}
