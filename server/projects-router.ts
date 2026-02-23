import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { db } from './db.js'
import { getUserIdFromAccessToken } from './auth-utils.js'

function requireAuth(req: Request, res: Response, next: () => void) {
  const userId = getUserIdFromAccessToken(req)
  if (!userId) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' })
    return
  }
  ;(req as Request & { userId: string }).userId = userId
  next()
}

export const projectsRouter = Router()

const PROJECTS_BASE = '/projects'

// GET /api/projects - list projects (excludes soft-deleted by default)
projectsRouter.get(PROJECTS_BASE, requireAuth, (req: Request, res: Response) => {
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10))
  const pageSize = Math.min(50, Math.max(1, parseInt((req.query.pageSize as string) || '12', 10)))
  const search = (req.query.search as string)?.trim()
  const includeDeleted = req.query.includeDeleted === 'true'

  let where = '1=1'
  const params: unknown[] = []
  if (!includeDeleted) {
    where += ' AND (deleted_at IS NULL OR deleted_at = "")'
  }
  if (search) {
    where += ' AND name LIKE ?'
    params.push(`%${search}%`)
  }

  const countRow = db.prepare(`SELECT COUNT(*) as c FROM projects WHERE ${where}`).get(...params) as { c: number }
  const total = countRow?.c ?? 0

  const rows = db.prepare(
    `SELECT id, name, description, created_at, updated_at, deleted_at
     FROM projects
     WHERE ${where}
     ORDER BY updated_at DESC, created_at DESC
     LIMIT ? OFFSET ?`
  ).all(...params, pageSize, (page - 1) * pageSize) as {
    id: string
    name: string
    description: string | null
    created_at: string
    updated_at: string | null
    deleted_at: string | null
  }[]

  const pendingByProject = db.prepare(
    `SELECT project_id, COUNT(*) as count FROM decisions
     WHERE (deleted_at IS NULL OR deleted_at = "")
     AND status IN ('pending', 'in_review') GROUP BY project_id`
  ).all() as { project_id: string; count: number }[]
  const pendingMap = Object.fromEntries(pendingByProject.map((p) => [p.project_id, p.count]))

  res.json({
    items: rows.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? undefined,
      status: p.deleted_at ? 'archived' : 'active',
      createdAt: p.created_at,
      updatedAt: p.updated_at ?? p.created_at,
      deletedAt: p.deleted_at ?? undefined,
      pendingApprovalsCount: pendingMap[p.id] ?? 0,
    })),
    total,
    page,
    pageSize,
  })
})

// POST /api/projects - create project
projectsRouter.post(PROJECTS_BASE, requireAuth, (req: Request, res: Response) => {
  const userId = (req as Request & { userId: string }).userId
  const { name, description } = req.body as { name?: string; description?: string }

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Project name is required' })
    return
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  db.prepare(
    `INSERT INTO projects (id, name, description, account_id, studio_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name.trim(), description?.trim() ?? null, userId, 'default', now, now)

  res.status(201).json({
    id,
    name: name.trim(),
    description: description?.trim() ?? undefined,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    pendingApprovalsCount: 0,
  })
})

// GET /api/projects/:id - get single project
projectsRouter.get(`${PROJECTS_BASE}/:id`, requireAuth, (req: Request, res: Response) => {
  const { id } = req.params

  const row = db.prepare(
    `SELECT id, name, description, created_at, updated_at, deleted_at
     FROM projects WHERE id = ?`
  ).get(id) as {
    id: string
    name: string
    description: string | null
    created_at: string
    updated_at: string | null
    deleted_at: string | null
  } | undefined

  if (!row) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Project not found' })
  }

  const pendingCount = db.prepare(
    `SELECT COUNT(*) as count FROM decisions
     WHERE project_id = ? AND (deleted_at IS NULL OR deleted_at = "")
     AND status IN ('pending', 'in_review')`
  ).get(id) as { count: number }

  res.json({
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    status: row.deleted_at ? 'archived' : 'active',
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    deletedAt: row.deleted_at ?? undefined,
    pendingApprovalsCount: pendingCount?.count ?? 0,
  })
})

// GET /api/projects/:id/activity - recent activity feed for project decisions
projectsRouter.get(`${PROJECTS_BASE}/:id/activity`, requireAuth, (req: Request, res: Response) => {
  const { id: projectId } = req.params
  const limit = Math.min(20, Math.max(1, parseInt((req.query.limit as string) || '10', 10)))

  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId)
  if (!project) return res.status(404).json({ code: 'NOT_FOUND', message: 'Project not found' })

  const rows = db.prepare(
    `SELECT a.id, a.decision_id, a.action, a.performed_by, a.performed_at, d.title as decision_title
     FROM decision_audit_log a
     JOIN decisions d ON d.id = a.decision_id AND d.project_id = ?
     WHERE d.deleted_at IS NULL OR d.deleted_at = ''
     ORDER BY a.performed_at DESC LIMIT ?`
  ).all(projectId, limit) as { id: string; decision_id: string; action: string; performed_by: string | null; performed_at: string; decision_title: string }[]

  res.json({
    items: rows.map((r) => ({
      id: r.id,
      decisionId: r.decision_id,
      decisionTitle: r.decision_title,
      action: r.action,
      performedBy: r.performed_by,
      timestamp: r.performed_at,
    })),
  })
})

// PATCH /api/projects/:id - update project
projectsRouter.patch(`${PROJECTS_BASE}/:id`, requireAuth, (req: Request, res: Response) => {
  const { id } = req.params
  const { name, description } = req.body as { name?: string; description?: string }

  const row = db.prepare('SELECT id, deleted_at FROM projects WHERE id = ?').get(id)
  if (!row) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Project not found' })
  }
  if ((row as { deleted_at: string | null }).deleted_at) {
    return res.status(400).json({ code: 'INVALID_STATE', message: 'Cannot update archived project' })
  }

  const updates: string[] = []
  const params: unknown[] = []
  if (name !== undefined) {
    if (!name?.trim?.()) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Project name cannot be empty' })
    }
    updates.push('name = ?')
    params.push(name.trim())
  }
  if (description !== undefined) {
    updates.push('description = ?')
    params.push(description?.trim() ?? null)
  }

  if (updates.length === 0) {
    const current = db.prepare(
      'SELECT id, name, description, created_at, updated_at FROM projects WHERE id = ?'
    ).get(id) as { id: string; name: string; description: string | null; created_at: string; updated_at: string }
    return res.json({
      id: current.id,
      name: current.name,
      description: current.description ?? undefined,
      status: 'active',
      createdAt: current.created_at,
      updatedAt: current.updated_at,
    })
  }

  const now = new Date().toISOString()
  updates.push('updated_at = ?')
  params.push(now, id)

  db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...params)

  const updated = db.prepare(
    'SELECT id, name, description, created_at, updated_at FROM projects WHERE id = ?'
  ).get(id) as { id: string; name: string; description: string | null; created_at: string; updated_at: string }

  res.json({
    id: updated.id,
    name: updated.name,
    description: updated.description ?? undefined,
    status: 'active',
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  })
})

// DELETE /api/projects/:id - soft delete
projectsRouter.delete(`${PROJECTS_BASE}/:id`, requireAuth, (req: Request, res: Response) => {
  const { id } = req.params

  const row = db.prepare('SELECT id, deleted_at FROM projects WHERE id = ?').get(id)
  if (!row) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Project not found' })
  }
  if ((row as { deleted_at: string | null }).deleted_at) {
    return res.status(400).json({ code: 'INVALID_STATE', message: 'Project is already archived' })
  }

  const now = new Date().toISOString()
  db.prepare('UPDATE projects SET deleted_at = ?, updated_at = ? WHERE id = ?').run(now, now, id)

  res.json({ id, deletedAt: now })
})

// GET /api/projects/:id/client-links - list client share links for project
projectsRouter.get(`${PROJECTS_BASE}/:id/client-links`, requireAuth, (req: Request, res: Response) => {
  const { id: projectId } = req.params

  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId)
  if (!project) return res.status(404).json({ code: 'NOT_FOUND', message: 'Project not found' })

  type TokenRow = { id: string; project_id: string; decision_ids: string; scope: string; expires_at: string; revoked?: number; last_used_at: string | null; created_at: string }
  let rows: TokenRow[]
  try {
    rows = db.prepare(
      `SELECT id, project_id, decision_ids, scope, expires_at, revoked, last_used_at, created_at
       FROM client_tokens WHERE project_id = ? ORDER BY created_at DESC`
    ).all(projectId) as TokenRow[]
  } catch {
    rows = db.prepare(
      `SELECT id, project_id, decision_ids, scope, expires_at, created_at
       FROM client_tokens WHERE project_id = ? ORDER BY created_at DESC`
    ).all(projectId) as TokenRow[]
  }

  const decisionIds = [...new Set(rows.flatMap((r) => {
    try {
      return JSON.parse(r.decision_ids) as string[]
    } catch {
      return []
    }
  }))]
  const titles: Record<string, string> = {}
  if (decisionIds.length > 0) {
    const placeholders = decisionIds.map(() => '?').join(',')
    const decRows = db.prepare(
      `SELECT id, title FROM decisions WHERE id IN (${placeholders})`
    ).all(...decisionIds) as { id: string; title: string }[]
    for (const d of decRows) {
      titles[d.id] = d.title
    }
  }

  const links = rows.map((r) => {
    let ids: string[] = []
    try {
      ids = JSON.parse(r.decision_ids)
    } catch {
      // ignore
    }
    return {
      id: r.id,
      projectId: r.project_id,
      decisionIds: ids,
      decisionTitles: ids.map((did) => titles[did] ?? 'Unknown'),
      scope: r.scope,
      expiresAt: r.expires_at,
      revoked: !!r.revoked,
      lastUsedAt: r.last_used_at ?? undefined,
      createdAt: r.created_at,
    }
  })

  res.json({ items: links })
})

// POST /api/projects/:id/client-links/:tokenId/revoke - revoke a client link
projectsRouter.post(`${PROJECTS_BASE}/:id/client-links/:tokenId/revoke`, requireAuth, (req: Request, res: Response) => {
  const { id: projectId, tokenId } = req.params

  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId)
  if (!project) return res.status(404).json({ code: 'NOT_FOUND', message: 'Project not found' })

  const token = db.prepare(
    'SELECT id, project_id, revoked FROM client_tokens WHERE id = ? AND project_id = ?'
  ).get(tokenId, projectId) as { id: string; project_id: string; revoked?: number } | undefined

  if (!token) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Client link not found' })
  }

  try {
    db.prepare('UPDATE client_tokens SET revoked = 1 WHERE id = ?').run(tokenId)
  } catch {
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to revoke link' })
  }

  res.json({ revoked: true, tokenId })
})

// GET /api/projects/:id/client-links/:tokenId/analytics - analytics for a client link
projectsRouter.get(`${PROJECTS_BASE}/:id/client-links/:tokenId/analytics`, requireAuth, (req: Request, res: Response) => {
  const { id: projectId, tokenId } = req.params

  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId)
  if (!project) return res.status(404).json({ code: 'NOT_FOUND', message: 'Project not found' })

  const token = db.prepare(
    'SELECT id, project_id FROM client_tokens WHERE id = ? AND project_id = ?'
  ).get(tokenId, projectId)

  if (!token) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Client link not found' })
  }

  let rows: { event_type: string; decision_id: string | null; created_at: string }[] = []
  try {
    rows = db.prepare(
      `SELECT event_type, decision_id, created_at FROM portal_analytics
       WHERE token_id = ? ORDER BY created_at DESC LIMIT 500`
    ).all(tokenId) as typeof rows
  } catch {
    // portal_analytics may not exist
  }

  const views = rows.filter((r) => r.event_type === 'view').length
  const comments = rows.filter((r) => r.event_type === 'comment').length
  const approvals = rows.filter((r) => r.event_type === 'approve').length
  const exports = rows.filter((r) => r.event_type === 'export').length
  const lastSeenAt = rows[0]?.created_at ?? null

  res.json({
    views,
    comments,
    approvals,
    exports,
    lastSeenAt,
    events: rows.slice(0, 50).map((r) => ({
      eventType: r.event_type,
      decisionId: r.decision_id,
      timestamp: r.created_at,
    })),
  })
})

// POST /api/projects/:id/restore - restore soft-deleted project
projectsRouter.post(`${PROJECTS_BASE}/:id/restore`, requireAuth, (req: Request, res: Response) => {
  const { id } = req.params

  const row = db.prepare('SELECT id, deleted_at FROM projects WHERE id = ?').get(id)
  if (!row) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Project not found' })
  }
  if (!(row as { deleted_at: string | null }).deleted_at) {
    return res.status(400).json({ code: 'INVALID_STATE', message: 'Project is not archived' })
  }

  const now = new Date().toISOString()
  db.prepare('UPDATE projects SET deleted_at = NULL, updated_at = ? WHERE id = ?').run(now, id)

  const updated = db.prepare(
    'SELECT id, name, description, created_at, updated_at FROM projects WHERE id = ?'
  ).get(id) as { id: string; name: string; description: string | null; created_at: string; updated_at: string }

  res.json({
    id: updated.id,
    name: updated.name,
    description: updated.description ?? undefined,
    status: 'active',
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  })
})
