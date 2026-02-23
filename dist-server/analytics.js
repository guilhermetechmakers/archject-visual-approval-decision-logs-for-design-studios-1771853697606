import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from './db.js';
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
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
export const analyticsRouter = Router();
// GET /api/projects (list)
analyticsRouter.get('/projects', requireAuth, (_req, res) => {
    const rows = db.prepare('SELECT id, name FROM projects ORDER BY name').all();
    res.json({ projects: rows });
});
// GET /api/projects/:projectId/analytics (must be before /projects/:projectId)
analyticsRouter.get('/projects/:projectId/analytics', requireAuth, (req, res) => {
    const { projectId } = req.params;
    const start = req.query.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const end = req.query.end || new Date().toISOString().slice(0, 10);
    const groupBy = req.query.groupBy || 'day';
    try {
        const project = db.prepare('SELECT id, name FROM projects WHERE id = ?').get(projectId);
        if (!project) {
            return res.status(404).json({ code: 'NOT_FOUND', message: 'Project not found' });
        }
        const decisions = db.prepare(`SELECT id, title, status, type, created_at, decision_made_at, reviewer_id
       FROM decisions WHERE project_id = ? AND created_at >= ? AND created_at <= ?
       ORDER BY created_at ASC`).all(projectId, `${start}T00:00:00.000Z`, `${end}T23:59:59.999Z`);
        const withApprovalTime = decisions
            .filter((d) => d.decision_made_at)
            .map((d) => ({
            ...d,
            approvalSeconds: Math.floor((new Date(d.decision_made_at).getTime() - new Date(d.created_at).getTime()) / 1000),
        }));
        const medianApprovalSeconds = withApprovalTime.length > 0
            ? (() => {
                const sorted = [...withApprovalTime].sort((a, b) => a.approvalSeconds - b.approvalSeconds);
                const mid = Math.floor(sorted.length / 2);
                return sorted.length % 2 ? sorted[mid].approvalSeconds : (sorted[mid - 1].approvalSeconds + sorted[mid].approvalSeconds) / 2;
            })()
            : 0;
        const pctWithinSla = withApprovalTime.length > 0
            ? (withApprovalTime.filter((d) => d.approvalSeconds <= 72 * 3600).length / withApprovalTime.length) * 100
            : 0;
        const avgResponseSeconds = withApprovalTime.length > 0
            ? Math.round(withApprovalTime.reduce((s, d) => s + d.approvalSeconds, 0) / withApprovalTime.length)
            : 0;
        const pendingCount = decisions.filter((d) => d.status === 'pending' || d.status === 'in_review').length;
        const heatmapByStatus = {};
        const statuses = ['pending', 'in_review', 're_requested', 'approved', 'declined'];
        statuses.forEach((s) => {
            heatmapByStatus[s] = {};
            decisions.forEach((d) => {
                if (d.status === s) {
                    const bucket = groupBy === 'week'
                        ? getWeekStart(d.created_at)
                        : d.created_at.slice(0, 10);
                    heatmapByStatus[s][bucket] = (heatmapByStatus[s][bucket] || 0) + 1;
                }
            });
        });
        const distributionBuckets = getDistributionBuckets(withApprovalTime.map((d) => d.approvalSeconds));
        const byStatus = {};
        statuses.forEach((s) => {
            byStatus[s] = Object.values(heatmapByStatus[s] || {}).reduce((a, b) => a + b, 0);
        });
        const byReviewer = {};
        decisions.forEach((d) => {
            const r = d.reviewer_id || 'unassigned';
            byReviewer[r] = (byReviewer[r] || 0) + 1;
        });
        const distribution = distributionBuckets.map((b) => ({
            bucket: b.bucket,
            count: b.count,
            bucketStart: b.minSeconds,
            bucketEnd: b.maxSeconds,
        }));
        res.json({
            projectId,
            projectName: project.name,
            start,
            end,
            kpis: {
                medianApprovalSeconds,
                pctWithinSla,
                totalDecisions: decisions.length,
                avgResponseSeconds,
                pendingCount,
            },
            heatmap: heatmapByStatus,
            byStatus,
            byReviewer,
            distribution,
            trend: { medianApprovalSeconds: medianApprovalSeconds * 0.95, pctWithinSla: Math.min(100, pctWithinSla + 2) },
        });
    }
    catch (e) {
        console.error('[Analytics] project analytics:', e);
        res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
});
// GET /api/projects/:projectId (project details)
analyticsRouter.get('/projects/:projectId', requireAuth, (req, res) => {
    const { projectId } = req.params;
    const project = db.prepare('SELECT id, name, account_id, studio_id, created_at, updated_at FROM projects WHERE id = ?').get(projectId);
    if (!project)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Project not found' });
    res.json({
        id: project.id,
        name: project.name,
        description: null,
        status: 'active',
        createdAt: project.created_at,
        updatedAt: project.updated_at,
    });
});
function getWeekStart(iso) {
    const d = new Date(iso);
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setUTCDate(diff);
    return monday.toISOString().slice(0, 10);
}
function getDistributionBuckets(seconds) {
    const buckets = [
        { label: '0-24h', min: 0, max: 24 * 3600 },
        { label: '24-48h', min: 24 * 3600, max: 48 * 3600 },
        { label: '48-72h', min: 48 * 3600, max: 72 * 3600 },
        { label: '72h-1w', min: 72 * 3600, max: 7 * 24 * 3600 },
        { label: '1w+', min: 7 * 24 * 3600, max: Infinity },
    ];
    return buckets.map((b) => ({
        bucket: b.label,
        count: seconds.filter((s) => s >= b.min && s < b.max).length,
        minSeconds: b.min,
        maxSeconds: b.max === Infinity ? 999999999 : b.max,
    }));
}
// GET /api/analytics/decisions
analyticsRouter.get('/analytics/decisions', requireAuth, (req, res) => {
    const projectId = req.query.projectId;
    const start = req.query.start;
    const end = req.query.end;
    const status = req.query.status;
    const type = req.query.type;
    const reviewerId = req.query.reviewerId;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const sort = req.query.sort || 'created_at';
    const sortDir = req.query.sortDir || 'desc';
    let where = '1=1';
    const params = [];
    if (projectId) {
        where += ' AND d.project_id = ?';
        params.push(projectId);
    }
    if (start) {
        where += ' AND d.created_at >= ?';
        params.push(`${start}T00:00:00.000Z`);
    }
    if (end) {
        where += ' AND d.created_at <= ?';
        params.push(`${end}T23:59:59.999Z`);
    }
    if (status) {
        where += ' AND d.status = ?';
        params.push(status);
    }
    if (type) {
        where += ' AND d.type = ?';
        params.push(type);
    }
    if (reviewerId) {
        where += ' AND d.reviewer_id = ?';
        params.push(reviewerId);
    }
    const orderCol = sort === 'timeToDecision'
        ? "(CASE WHEN d.decision_made_at IS NOT NULL THEN (julianday(d.decision_made_at) - julianday(d.created_at)) * 86400 ELSE 0 END)"
        : `d.${sort}`;
    const orderDir = sortDir === 'asc' ? 'ASC' : 'DESC';
    try {
        const countRow = db.prepare(`SELECT COUNT(*) as c FROM decisions d WHERE ${where}`).get(...params);
        const rows = db.prepare(`SELECT d.id, d.project_id, d.title, d.status, d.type, d.created_at, d.decision_made_at, d.reviewer_id,
              p.name as project_name
       FROM decisions d
       LEFT JOIN projects p ON d.project_id = p.id
       WHERE ${where}
       ORDER BY ${orderCol} ${orderDir}
       LIMIT ? OFFSET ?`).all(...params, limit, (page - 1) * limit);
        const decisions = rows.map((r) => {
            const timeToDecision = r.decision_made_at
                ? Math.floor((new Date(r.decision_made_at).getTime() - new Date(r.created_at).getTime()) / 1000)
                : null;
            return {
                id: r.id,
                projectId: r.project_id,
                projectName: r.project_name || 'Unknown',
                title: r.title,
                status: r.status,
                type: r.type,
                createdAt: r.created_at,
                decisionMadeAt: r.decision_made_at,
                reviewerId: r.reviewer_id,
                timeToDecisionSeconds: timeToDecision,
            };
        });
        res.json({
            decisions,
            total: countRow.c,
            page,
            limit,
        });
    }
    catch (e) {
        console.error('[Analytics] decisions:', e);
        res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
});
// POST /api/exports
analyticsRouter.post('/exports', requireAuth, (req, res) => {
    const userId = req.userId;
    const { scope, filters, format } = req.body;
    if (!scope || !scope.projectId) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Scope with projectId required' });
    }
    const fmt = format === 'json' ? 'json' : 'csv';
    const id = crypto.randomUUID();
    db.prepare(`INSERT INTO analytics_exports (id, requested_by, scope, filters_json, format, status)
     VALUES (?, ?, ?, ?, ?, 'queued')`).run(id, userId, JSON.stringify(scope), filters ? JSON.stringify(filters) : null, fmt);
    setTimeout(() => {
        try {
            const projectId = scope.projectId;
            const count = projectId
                ? db.prepare('SELECT COUNT(*) as c FROM decisions WHERE project_id = ?').get(projectId).c
                : 0;
            db.prepare('UPDATE analytics_exports SET status = ?, rows_count = ?, completed_at = ? WHERE id = ?').run('done', count, new Date().toISOString(), id);
        }
        catch {
            db.prepare('UPDATE analytics_exports SET status = ? WHERE id = ?').run('failed', id);
        }
    }, 2000);
    res.status(201).json({ id, status: 'queued', format: fmt });
});
// GET /api/exports/:exportId/status
analyticsRouter.get('/exports/:exportId/status', requireAuth, (req, res) => {
    const userId = req.userId;
    const { exportId } = req.params;
    const row = db.prepare('SELECT * FROM analytics_exports WHERE id = ? AND requested_by = ?').get(exportId, userId);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Export not found' });
    res.json({
        id: row.id,
        status: row.status,
        rowsCount: row.rows_count,
        completedAt: row.completed_at,
    });
});
// GET /api/exports/:exportId/download - returns JSON with file URL
analyticsRouter.get('/exports/:exportId/download', requireAuth, (req, res) => {
    const userId = req.userId;
    const { exportId } = req.params;
    const row = db.prepare('SELECT * FROM analytics_exports WHERE id = ? AND requested_by = ?').get(exportId, userId);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Export not found' });
    if (row.status !== 'done') {
        return res.status(400).json({ code: 'NOT_READY', message: 'Export not yet completed' });
    }
    const baseUrl = (req.get('x-forwarded-proto') || req.protocol) + '://' + (req.get('x-forwarded-host') || req.get('host') || 'localhost:3001');
    res.json({ downloadUrl: `${baseUrl}/api/exports/${exportId}/file` });
});
// GET /api/exports/:exportId/file - serve generated CSV (generates on demand if queued)
analyticsRouter.get('/exports/:exportId/file', requireAuth, (req, res) => {
    const userId = req.userId;
    const { exportId } = req.params;
    const row = db.prepare('SELECT * FROM analytics_exports WHERE id = ? AND requested_by = ?').get(exportId, userId);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Export not found' });
    const scope = (() => {
        try {
            return JSON.parse(row.scope || '{}');
        }
        catch {
            return {};
        }
    })();
    const projectId = scope.projectId;
    const decisions = projectId
        ? db.prepare('SELECT * FROM decisions WHERE project_id = ?').all(projectId)
        : [];
    const headers = decisions.length > 0 ? Object.keys(decisions[0]) : ['id', 'project_id', 'title', 'status', 'created_at'];
    const csv = [headers.join(','), ...decisions.map((d) => headers.map((h) => JSON.stringify(d[h] ?? '')).join(','))].join('\n');
    db.prepare('UPDATE analytics_exports SET status = ?, rows_count = ?, completed_at = ? WHERE id = ?').run('done', decisions.length, new Date().toISOString(), exportId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=export-${exportId.slice(0, 8)}.csv`);
    res.send(csv);
});
// GET /api/exports (list user's exports)
analyticsRouter.get('/exports', requireAuth, (req, res) => {
    const userId = req.userId;
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '10', 10)));
    const rows = db.prepare(`SELECT id, scope, filters_json, format, status, rows_count, created_at, completed_at
     FROM analytics_exports WHERE requested_by = ? ORDER BY created_at DESC LIMIT ?`).all(userId, limit);
    res.json({
        exports: rows.map((r) => ({
            id: r.id,
            scope: typeof r.scope === 'string' ? JSON.parse(r.scope || '{}') : r.scope,
            filters: r.filters_json ? JSON.parse(r.filters_json) : null,
            format: r.format,
            status: r.status,
            rowsCount: r.rows_count,
            createdAt: r.created_at,
            completedAt: r.completed_at,
        })),
    });
});
// CRUD /api/alerts
analyticsRouter.get('/alerts', requireAuth, (req, res) => {
    const scope = req.query.scope;
    const scopeId = req.query.scopeId;
    let where = 'created_by = ?';
    const params = [req.userId];
    if (scope) {
        where += ' AND scope_type = ?';
        params.push(scope);
    }
    if (scopeId) {
        where += ' AND scope_id = ?';
        params.push(scopeId);
    }
    const rows = db.prepare(`SELECT * FROM alerts WHERE ${where} ORDER BY created_at DESC`).all(...params);
    res.json({
        alerts: rows.map((r) => ({
            id: r.id,
            name: r.name,
            scopeType: r.scope_type,
            scopeId: r.scope_id,
            metric: r.metric,
            operator: r.operator,
            thresholdValue: r.threshold_value,
            frequencyMinutes: r.frequency_minutes,
            channels: r.channels ? JSON.parse(r.channels) : {},
            enabled: !!r.enabled,
            lastTriggeredAt: r.last_triggered_at,
            createdAt: r.created_at,
        })),
    });
});
analyticsRouter.post('/alerts', requireAuth, (req, res) => {
    const userId = req.userId;
    const { name, scopeType, scopeId, metric, operator, thresholdValue, frequencyMinutes, channels } = req.body;
    if (!name || !scopeType || !metric || !operator || thresholdValue == null) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'name, scopeType, metric, operator, thresholdValue required' });
    }
    const id = crypto.randomUUID();
    db.prepare(`INSERT INTO alerts (id, name, scope_type, scope_id, metric, operator, threshold_value, frequency_minutes, channels, enabled, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`).run(id, name, scopeType, scopeId || null, metric, operator, thresholdValue, frequencyMinutes ?? 60, channels ? JSON.stringify(channels) : null, userId);
    res.status(201).json({ id, status: 'created' });
});
analyticsRouter.put('/alerts/:id', requireAuth, (req, res) => {
    const userId = req.userId;
    const { id } = req.params;
    const { enabled, ...updates } = req.body;
    const row = db.prepare('SELECT id FROM alerts WHERE id = ? AND created_by = ?').get(id, userId);
    if (!row)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Alert not found' });
    const sets = [];
    const params = [];
    if (enabled !== undefined) {
        sets.push('enabled = ?');
        params.push(enabled ? 1 : 0);
    }
    Object.entries(updates).forEach(([k, v]) => {
        if (['name', 'scopeType', 'scopeId', 'metric', 'operator', 'thresholdValue', 'frequencyMinutes', 'channels'].includes(k)) {
            const col = k === 'scopeType' ? 'scope_type' : k === 'scopeId' ? 'scope_id' : k === 'thresholdValue' ? 'threshold_value' : k === 'frequencyMinutes' ? 'frequency_minutes' : k;
            sets.push(`${col} = ?`);
            params.push(typeof v === 'object' ? JSON.stringify(v) : v);
        }
    });
    if (sets.length > 0) {
        params.push(id);
        db.prepare(`UPDATE alerts SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    }
    res.json({ id, status: 'updated' });
});
analyticsRouter.delete('/alerts/:id', requireAuth, (req, res) => {
    const userId = req.userId;
    const { id } = req.params;
    const r = db.prepare('DELETE FROM alerts WHERE id = ? AND created_by = ?').run(id, userId);
    if (r.changes === 0)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Alert not found' });
    res.json({ id, status: 'deleted' });
});
// GET /api/projects (for user's project selector)
analyticsRouter.get('/projects', requireAuth, (req, res) => {
    const rows = db.prepare('SELECT id, name FROM projects ORDER BY name').all();
    res.json({ projects: rows });
});
