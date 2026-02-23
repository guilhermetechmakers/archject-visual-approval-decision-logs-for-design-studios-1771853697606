import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { db } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'

function requireAuth(req: Request, res: Response, next: () => void) {
  const auth = req.get('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' })
    return
  }
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET) as { sub: string }
    ;(req as Request & { userId: string }).userId = decoded.sub
    next()
  } catch {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid or expired token' })
  }
}

export const dashboardRouter = Router()

/**
 * GET /api/dashboard/summary
 * Returns minimal summary for DashboardLanding: projects, recent decisions, pending approvals, quick actions.
 */
dashboardRouter.get('/summary', requireAuth, (req: Request, res: Response) => {
  const userId = (req as Request & { userId: string }).userId

  const projects = db.prepare(
    'SELECT id, name, created_at, updated_at FROM projects ORDER BY updated_at DESC LIMIT 10'
  ).all() as { id: string; name: string; created_at: string; updated_at: string }[]

  const pendingByProject = db.prepare(
    `SELECT project_id, COUNT(*) as count FROM decisions
     WHERE status IN ('pending', 'in_review') GROUP BY project_id`
  ).all() as { project_id: string; count: number }[]
  const pendingMap = Object.fromEntries(pendingByProject.map((p) => [p.project_id, p.count]))

  const decisions = db.prepare(
    `SELECT d.id, d.title, d.status, d.created_at, d.project_id, p.name as project_name
     FROM decisions d
     LEFT JOIN projects p ON d.project_id = p.id
     ORDER BY d.created_at DESC
     LIMIT 10`
  ).all() as {
    id: string
    title: string
    status: string
    created_at: string
    project_id: string
    project_name: string | null
  }[]

  const pendingCount = db.prepare(
    "SELECT COUNT(*) as count FROM decisions WHERE status IN ('pending', 'in_review')"
  ).get() as { count: number }

  const pendingApprovals = db.prepare(
    `SELECT d.id, d.title, d.project_id, p.name as project_name
     FROM decisions d
     LEFT JOIN projects p ON d.project_id = p.id
     WHERE d.status IN ('pending', 'in_review')
     ORDER BY d.created_at DESC
     LIMIT 10`
  ).all() as { id: string; title: string; project_id: string; project_name: string | null }[]

  const recentDecisions = decisions.map((d) => ({
    id: d.id,
    title: d.title,
    project: d.project_name ?? 'Unknown',
    status: d.status,
    date: d.created_at,
    projectId: d.project_id,
  }))

  const quickActions = [
    { id: 'create-decision', label: 'Create Decision', href: '/dashboard/projects', icon: 'plus' },
    { id: 'invite-client', label: 'Invite Client', href: '/dashboard/settings/team', icon: 'user-plus' },
  ]

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
    })),
    pendingApprovalsCount: pendingCount?.count ?? 0,
    quickActions,
  })
})
