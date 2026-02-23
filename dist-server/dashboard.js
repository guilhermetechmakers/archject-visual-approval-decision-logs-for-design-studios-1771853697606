import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from './db.js';
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
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
export const dashboardRouter = Router();
/**
 * GET /api/dashboard/metrics
 * Returns dashboard KPI metrics.
 */
dashboardRouter.get('/metrics', requireAuth, (_req, res) => {
    const pendingCount = db.prepare("SELECT COUNT(*) as count FROM decisions WHERE status IN ('pending', 'in_review')").get();
    const activeProjects = db.prepare('SELECT COUNT(*) as count FROM projects').get();
    const avgResponseRow = db.prepare(`SELECT AVG((julianday(decision_made_at) - julianday(created_at)) * 86400) as avg_sec
     FROM decisions WHERE decision_made_at IS NOT NULL`).get();
    const avgResponseTimeMs = avgResponseRow?.avg_sec ? Math.round(avgResponseRow.avg_sec * 1000) : 0;
    res.json({
        pendingApprovals: pendingCount?.count ?? 0,
        activeProjects: activeProjects?.count ?? 0,
        avgResponseTimeMs,
        exportCredits: 100,
    });
});
/**
 * GET /api/dashboard/projects
 * Query: page, pageSize, sort, status, owner, dateRange, search
 */
dashboardRouter.get('/projects', requireAuth, (req, res) => {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize || '12', 10)));
    const search = req.query.search?.trim();
    let where = '1=1';
    const params = [];
    if (search) {
        where += ' AND p.name LIKE ?';
        params.push(`%${search}%`);
    }
    const pendingByProject = db.prepare(`SELECT project_id, COUNT(*) as count FROM decisions
     WHERE status IN ('pending', 'in_review') GROUP BY project_id`).all();
    const pendingMap = Object.fromEntries(pendingByProject.map((p) => [p.project_id, p.count]));
    const countRow = db.prepare(`SELECT COUNT(*) as c FROM projects p WHERE ${where}`).get(...params);
    const total = countRow?.c ?? 0;
    const rows = db.prepare(`SELECT p.id, p.name, p.created_at, p.updated_at FROM projects p
     WHERE ${where}
     ORDER BY p.updated_at DESC
     LIMIT ? OFFSET ?`).all(...params, pageSize, (page - 1) * pageSize);
    res.json({
        items: rows.map((p) => ({
            id: p.id,
            name: p.name,
            status: 'Active',
            lastActivity: p.updated_at,
            pendingApprovals: pendingMap[p.id] ?? 0,
            owner: 'You',
            colorAccent: '#0052CC',
        })),
        total,
        page,
        pageSize,
    });
});
/**
 * GET /api/dashboard/activities
 * Returns recent activity feed items.
 */
dashboardRouter.get('/activities', requireAuth, (_req, res) => {
    const decisions = db.prepare(`SELECT d.id, d.title, d.status, d.created_at, d.decision_made_at, d.reviewer_id, d.project_id, p.name as project_name
     FROM decisions d
     LEFT JOIN projects p ON d.project_id = p.id
     ORDER BY COALESCE(d.decision_made_at, d.created_at) DESC
     LIMIT 20`).all();
    const activities = decisions.map((d) => {
        const action = d.status === 'approved' || d.status === 'declined' ? 'approved' : 'created';
        const timestamp = d.decision_made_at ?? d.created_at;
        return {
            id: d.id,
            actorId: d.reviewer_id ?? 'system',
            actorName: d.reviewer_id ? 'Client' : 'System',
            avatarUrl: null,
            action,
            targetType: 'Decision',
            targetId: d.id,
            targetTitle: d.title,
            projectId: d.project_id,
            projectName: d.project_name ?? 'Unknown',
            timestamp,
        };
    });
    res.json({ items: activities });
});
/**
 * GET /api/dashboard/notifications/summary
 * Returns unread notifications count for header bell.
 */
dashboardRouter.get('/notifications/summary', requireAuth, (_req, res) => {
    const pendingCount = db.prepare("SELECT COUNT(*) as count FROM decisions WHERE status IN ('pending', 'in_review')").get();
    res.json({ unreadCount: pendingCount?.count ?? 0 });
});
/**
 * POST /api/dashboard/projects
 * Create a new project.
 */
dashboardRouter.post('/projects', requireAuth, (req, res) => {
    const userId = req.userId;
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Project name is required' });
        return;
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO projects (id, name, account_id, studio_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, name.trim(), userId, 'default', now, now);
    res.status(201).json({
        id,
        name: name.trim(),
        status: 'active',
        createdAt: now,
        updatedAt: now,
        pendingApprovalsCount: 0,
    });
});
/**
 * GET /api/dashboard/summary
 * Returns minimal summary for DashboardLanding: projects, recent decisions, pending approvals, quick actions.
 */
dashboardRouter.get('/summary', requireAuth, (req, res) => {
    const userId = req.userId;
    const projects = db.prepare('SELECT id, name, created_at, updated_at FROM projects ORDER BY updated_at DESC LIMIT 10').all();
    const pendingByProject = db.prepare(`SELECT project_id, COUNT(*) as count FROM decisions
     WHERE status IN ('pending', 'in_review') GROUP BY project_id`).all();
    const pendingMap = Object.fromEntries(pendingByProject.map((p) => [p.project_id, p.count]));
    const decisions = db.prepare(`SELECT d.id, d.title, d.status, d.created_at, d.project_id, p.name as project_name
     FROM decisions d
     LEFT JOIN projects p ON d.project_id = p.id
     ORDER BY d.created_at DESC
     LIMIT 10`).all();
    const pendingCount = db.prepare("SELECT COUNT(*) as count FROM decisions WHERE status IN ('pending', 'in_review')").get();
    const pendingApprovals = db.prepare(`SELECT d.id, d.title, d.project_id, p.name as project_name
     FROM decisions d
     LEFT JOIN projects p ON d.project_id = p.id
     WHERE d.status IN ('pending', 'in_review')
     ORDER BY d.created_at DESC
     LIMIT 10`).all();
    const recentDecisions = decisions.map((d) => ({
        id: d.id,
        title: d.title,
        project: d.project_name ?? 'Unknown',
        status: d.status,
        date: d.created_at,
        projectId: d.project_id,
    }));
    const quickActions = [
        { id: 'create-decision', label: 'Create Decision', href: '/dashboard/projects', icon: 'plus' },
        { id: 'invite-client', label: 'Invite Client', href: '/dashboard/settings/team', icon: 'user-plus' },
    ];
    res.json({
        projects: projects.map((p) => ({
            id: p.id,
            name: p.name,
            status: 'active',
            createdAt: p.created_at,
            updatedAt: p.updated_at,
            pendingApprovalsCount: pendingMap[p.id] ?? 0,
        })),
        recentDecisions,
        pendingApprovals: pendingApprovals.map((a) => ({
            id: a.id,
            title: a.title,
            client: 'Client',
            project: a.project_name ?? 'Unknown',
            projectId: a.project_id,
        })),
        pendingApprovalsCount: pendingCount?.count ?? 0,
        quickActions,
    });
});
