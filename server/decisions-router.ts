import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { db } from './db.js'
import { sendValidationError } from './error-middleware.js'

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

export const decisionsRouter = Router()

// GET /api/templates - list decision templates
decisionsRouter.get('/templates', requireAuth, (_req: Request, res: Response) => {
  try {
    const rows = db.prepare(
      'SELECT id, name, description, default_options_json FROM decision_templates ORDER BY name'
    ).all() as { id: string; name: string; description: string | null; default_options_json: string | null }[]

    const templates = rows.map((r) => {
      let defaultOptions: { title: string; description?: string; isDefault?: boolean; isRecommended?: boolean }[] = []
      if (r.default_options_json) {
        try {
          defaultOptions = JSON.parse(r.default_options_json)
        } catch {
          // ignore
        }
      }
      return {
        id: r.id,
        name: r.name,
        description: r.description ?? '',
        defaultOptions,
        previewAssets: [] as string[],
      }
    })
    res.json({ templates })
  } catch (e) {
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to fetch templates' })
  }
})

// GET /api/projects/:projectId/decisions - list decisions for project (excludes soft-deleted, optionally excludes archived)
decisionsRouter.get('/projects/:projectId/decisions', requireAuth, (req: Request, res: Response) => {
  const { projectId } = req.params
  const includeDeleted = req.query.includeDeleted === 'true'
  const includeArchived = req.query.includeArchived === 'true'
  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId)
  if (!project) return res.status(404).json({ code: 'NOT_FOUND', message: 'Project not found' })

  let where = 'project_id = ?'
  const params: string[] = [projectId]
  if (!includeDeleted) {
    where += ' AND (deleted_at IS NULL OR deleted_at = \'\')'
  }
  if (!includeArchived) {
    try {
      where += ' AND (is_archived = 0 OR is_archived IS NULL)'
    } catch {
      // is_archived column may not exist
    }
  }

  type Row = { id: string; project_id: string; title: string; status: string; created_at: string; updated_at: string | null; approved_option_id?: string | null }
  let rows: Row[]
  try {
    rows = db.prepare(
      `SELECT id, project_id, title, status, created_at, updated_at, approved_option_id FROM decisions WHERE ${where} ORDER BY created_at DESC`
    ).all(...params) as Row[]
  } catch {
    try {
      rows = db.prepare(
        `SELECT id, project_id, title, status, created_at, updated_at FROM decisions WHERE ${where} ORDER BY created_at DESC`
      ).all(...params) as Row[]
    } catch {
      rows = db.prepare(
        `SELECT id, project_id, title, status, created_at, COALESCE(updated_at, created_at) as updated_at FROM decisions WHERE project_id = ? AND (deleted_at IS NULL OR deleted_at = '') ORDER BY created_at DESC`
      ).all(projectId) as Row[]
    }
  }

  const decisionIds = rows.map((r) => r.id)
  let optionsByDecision: Record<string, { id: string; label: string; description?: string }[]> = {}
  if (decisionIds.length > 0) {
    const placeholders = decisionIds.map(() => '?').join(',')
    const optRows = db.prepare(
      `SELECT id, decision_id, title, description FROM decision_options WHERE decision_id IN (${placeholders}) ORDER BY decision_id, sort_order`
    ).all(...decisionIds) as { id: string; decision_id: string; title: string; description: string | null }[]
    for (const o of optRows) {
      if (!optionsByDecision[o.decision_id]) optionsByDecision[o.decision_id] = []
      optionsByDecision[o.decision_id].push({
        id: o.id,
        label: o.title,
        description: o.description ?? undefined,
      })
    }
  }

  const decisions = rows.map((r) => ({
    id: r.id,
    projectId: r.project_id,
    title: r.title,
    status: r.status,
    approvedOptionId: r.approved_option_id ?? undefined,
    options: optionsByDecision[r.id] ?? [],
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? r.created_at,
  }))
  res.json(decisions)
})

// POST /api/projects/:projectId/decisions - create draft decision (idempotent with Idempotency-Key header)
decisionsRouter.post('/projects/:projectId/decisions', requireAuth, (req: Request, res: Response) => {
  const userId = (req as Request & { userId: string }).userId
  const { projectId } = req.params
  const idempotencyKey = req.get('Idempotency-Key')
  const { templateId, fromScratch, title, description, options } = req.body as {
    templateId?: string
    fromScratch?: boolean
    title?: string
    description?: string
    options?: { title: string; description?: string; isDefault?: boolean; isRecommended?: boolean }[]
  }

  if (idempotencyKey) {
    const cached = db.prepare(
      'SELECT response_status, response_body FROM idempotency_keys WHERE id = ? AND user_id = ? AND endpoint = ?'
    ).get(idempotencyKey, userId, `POST:/api/projects/${projectId}/decisions`) as { response_status: number; response_body: string } | undefined
    if (cached) {
      res.status(cached.response_status).json(JSON.parse(cached.response_body))
      return
    }
  }

  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId)
  if (!project) return res.status(404).json({ code: 'NOT_FOUND', message: 'Project not found' })

  const details: Array<{ field?: string; message: string; code?: string }> = []
  if (!title?.trim?.()) details.push({ field: 'title', message: 'Decision title is required', code: 'REQUIRED' })
  if (!options?.length) details.push({ field: 'options', message: 'Add at least one option', code: 'REQUIRED' })
  if (details.length > 0) {
    sendValidationError(res, req, 'Validation failed', details)
    return
  }

  const decisionId = crypto.randomUUID()
  const now = new Date().toISOString()
  const status = 'draft'
  const etag = crypto.createHash('md5').update(decisionId + now).digest('hex')

  let opts = options ?? []
  if (templateId && !fromScratch) {
    const t = db.prepare('SELECT default_options_json FROM decision_templates WHERE id = ?').get(templateId) as
      | { default_options_json: string | null }
      | undefined
    if (t?.default_options_json) {
      try {
        opts = JSON.parse(t.default_options_json)
      } catch {
        // ignore
      }
    }
  }

  try {
    db.prepare(
      `INSERT INTO decisions (id, project_id, account_id, title, type, status, created_at, updated_at, created_by, etag, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
    ).run(
      decisionId,
      projectId,
      userId,
      title ?? 'Untitled Decision',
      'finishes',
      status,
      now,
      now,
      userId,
      etag
    )
  } catch (e) {
    if (String(e).includes('no such column')) {
      db.prepare(
        `INSERT INTO decisions (id, project_id, account_id, title, type, status, created_at, updated_at, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        decisionId,
        projectId,
        userId,
        title ?? 'Untitled Decision',
        'finishes',
        status,
        now,
        now,
        userId
      )
    } else throw e
  }

  for (let i = 0; i < opts.length; i++) {
    const o = opts[i]
    const optId = crypto.randomUUID()
    db.prepare(
      `INSERT INTO decision_options (id, decision_id, title, description, is_default, is_recommended, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      optId,
      decisionId,
      o.title ?? `Option ${i + 1}`,
      o.description ?? null,
      o.isDefault ? 1 : 0,
      o.isRecommended ? 1 : 0,
      i
    )
  }

  db.prepare(
    `INSERT INTO decision_audit_log (id, decision_id, action, performed_by, performed_at, details)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(crypto.randomUUID(), decisionId, 'created', userId, now, JSON.stringify({ fromTemplate: !!templateId }))

  const responseBody = { decisionId, status }
  if (idempotencyKey) {
    try {
      db.prepare(
        'INSERT INTO idempotency_keys (id, user_id, endpoint, response_status, response_body) VALUES (?, ?, ?, ?, ?)'
      ).run(idempotencyKey, userId, `POST:/api/projects/${projectId}/decisions`, 201, JSON.stringify(responseBody))
    } catch {
      // Ignore duplicate key - another request already stored it
    }
  }
  res.status(201).json(responseBody)
})

// GET /api/projects/:projectId/decisions/:decisionId
decisionsRouter.get('/projects/:projectId/decisions/:decisionId', requireAuth, (req: Request, res: Response) => {
  const { projectId, decisionId } = req.params
  const includeDeleted = req.query.includeDeleted === 'true'
  const whereClause = includeDeleted
    ? 'id = ? AND project_id = ?'
    : 'id = ? AND project_id = ? AND (deleted_at IS NULL OR deleted_at = "")'

  type DecisionRow = { id: string; project_id: string; title: string; description?: string; status: string; created_at: string; updated_at?: string; etag?: string; version?: number; approved_option_id?: string | null; cloned_from_decision_id?: string; version_number?: number; is_archived?: number }
  let row: DecisionRow | undefined
  try {
    row = db.prepare(
      `SELECT id, project_id, title, description, status, created_at, updated_at, etag, version, approved_option_id, cloned_from_decision_id, version_number, is_archived FROM decisions WHERE ${whereClause}`
    ).get(decisionId, projectId) as DecisionRow
  } catch {
    try {
      row = db.prepare(
        `SELECT id, project_id, title, status, created_at, updated_at, etag, version, approved_option_id FROM decisions WHERE ${whereClause}`
      ).get(decisionId, projectId) as DecisionRow
    } catch {
      row = db.prepare(
        `SELECT id, project_id, title, status, created_at, created_at as updated_at FROM decisions WHERE ${whereClause}`
      ).get(decisionId, projectId) as DecisionRow
    }
  }

  if (!row) return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' })

  if (row.etag) res.setHeader('ETag', `"${row.etag}"`)
  type OptRow = { id: string; title: string; description: string | null; is_default: number; is_recommended: number; sort_order: number; image_url?: string; drawing_ids?: string; cost_impact?: string }
  let options: OptRow[]
  try {
    options = db.prepare(
      'SELECT id, title, description, is_default, is_recommended, sort_order, image_url, drawing_ids, cost_impact FROM decision_options WHERE decision_id = ? ORDER BY sort_order'
    ).all(decisionId) as OptRow[]
  } catch {
    options = db.prepare(
      'SELECT id, title, description, is_default, is_recommended, sort_order FROM decision_options WHERE decision_id = ? ORDER BY sort_order'
    ).all(decisionId) as OptRow[]
  }

  res.json({
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description ?? '',
    status: row.status,
    approvedOptionId: row.approved_option_id ?? undefined,
    options: options.map((o) => ({
      id: o.id,
      label: o.title,
      description: o.description ?? undefined,
      isDefault: !!o.is_default,
      isRecommended: !!o.is_recommended,
      imageUrl: o.image_url ?? undefined,
      drawingIds: o.drawing_ids ? (() => { try { return JSON.parse(o.drawing_ids!) as string[] } catch { return [] } })() : undefined,
      costImpact: o.cost_impact ?? undefined,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    etag: row.etag ?? undefined,
    version: row.version ?? 1,
    clonedFromDecisionId: row.cloned_from_decision_id ?? undefined,
    versionNumber: row.version_number ?? undefined,
    isArchived: !!row.is_archived,
  })
})

// PATCH /api/projects/:projectId/decisions/:decisionId - same handler as PUT
decisionsRouter.patch('/projects/:projectId/decisions/:decisionId', requireAuth, (req: Request, res: Response) => {
  return decisionsPutHandler(req, res)
})

// PUT /api/projects/:projectId/decisions/:decisionId
function decisionsPutHandler(req: Request, res: Response) {
  const userId = (req as Request & { userId: string }).userId
  const { projectId, decisionId } = req.params
  const { title, description, options, approvalDeadline, reminders, clientMustTypeNameToConfirm, recipients } = req.body as {
    title?: string
    description?: string
    options?: { id?: string; title: string; description?: string; isDefault?: boolean; isRecommended?: boolean }[]
    approvalDeadline?: string
    reminders?: { type: string; schedule: string; message?: string }[]
    clientMustTypeNameToConfirm?: boolean
    recipients?: { contactEmail: string; role: string }[]
  }

  const row = db.prepare('SELECT id, status, etag FROM decisions WHERE id = ? AND project_id = ? AND (deleted_at IS NULL OR deleted_at = \'\')').get(decisionId, projectId)
  if (!row) return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' })
  if ((row as { status: string }).status === 'published') {
    return res.status(400).json({ code: 'INVALID_STATE', message: 'Cannot edit published decision' })
  }

  const ifMatch = req.get('If-Match')?.replace(/^"|"$/g, '')
  const currentEtag = (row as { etag?: string }).etag
  if (ifMatch && currentEtag && ifMatch !== currentEtag) {
    res.status(412).json({ code: 'PRECONDITION_FAILED', message: 'Decision was modified by another user. Please refresh and try again.' })
    return
  }

  const now = new Date().toISOString()
  const newEtag = crypto.createHash('md5').update(decisionId + now).digest('hex')
  const updates: string[] = ['updated_at = ?', 'etag = ?', 'updated_by = ?']
  const params: unknown[] = [now, newEtag, userId]

  if (title !== undefined) {
    updates.push('title = ?')
    params.push(title)
  }
  if (description !== undefined) {
    updates.push('description = ?')
    params.push(description)
  }
  params.push(decisionId)
  try {
    db.prepare(`UPDATE decisions SET ${updates.join(', ')} WHERE id = ?`).run(...params)
  } catch (e) {
    if (String(e).includes('no such column')) {
      db.prepare('UPDATE decisions SET updated_at = ? WHERE id = ?').run(now, decisionId)
    } else throw e
  }

  if (options && Array.isArray(options)) {
    const existing = db.prepare('SELECT id FROM decision_options WHERE decision_id = ?').all(decisionId) as { id: string }[]
    const existingIds = new Set(existing.map((e) => e.id))
    for (let i = 0; i < options.length; i++) {
      const o = options[i]
      if (o.id && existingIds.has(o.id)) {
        db.prepare(
          `UPDATE decision_options SET title = ?, description = ?, is_default = ?, is_recommended = ?, sort_order = ?, updated_at = ? WHERE id = ?`
        ).run(o.title, o.description ?? null, o.isDefault ? 1 : 0, o.isRecommended ? 1 : 0, i, now, o.id)
      } else {
        const optId = crypto.randomUUID()
        db.prepare(
          `INSERT INTO decision_options (id, decision_id, title, description, is_default, is_recommended, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(optId, decisionId, o.title, o.description ?? null, o.isDefault ? 1 : 0, o.isRecommended ? 1 : 0, i)
      }
    }
  }

  if (recipients && Array.isArray(recipients)) {
    db.prepare('DELETE FROM decision_recipients WHERE decision_id = ?').run(decisionId)
    for (const r of recipients) {
      if (r.contactEmail) {
        db.prepare(
          'INSERT INTO decision_recipients (id, decision_id, contact_email, role) VALUES (?, ?, ?, ?)'
        ).run(crypto.randomUUID(), decisionId, r.contactEmail, r.role ?? 'client')
      }
    }
  }

  db.prepare(
    `INSERT INTO decision_audit_log (id, decision_id, action, performed_by, performed_at, details)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(crypto.randomUUID(), decisionId, 'updated', userId, now, '{}')

  res.json({ decisionId, status: 'draft' })
}

decisionsRouter.put('/projects/:projectId/decisions/:decisionId', requireAuth, (req: Request, res: Response) => {
  return decisionsPutHandler(req, res)
})

// DELETE /api/projects/:projectId/decisions/:decisionId - soft delete
decisionsRouter.delete('/projects/:projectId/decisions/:decisionId', requireAuth, (req: Request, res: Response) => {
  const userId = (req as Request & { userId: string }).userId
  const { projectId, decisionId } = req.params

  const row = db.prepare('SELECT id, deleted_at FROM decisions WHERE id = ? AND project_id = ?').get(decisionId, projectId)
  if (!row) return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' })
  if ((row as { deleted_at: string | null }).deleted_at) {
    return res.json({ id: decisionId, deleted: true, message: 'Already deleted' })
  }

  const now = new Date().toISOString()
  const newEtag = crypto.createHash('md5').update(decisionId + now).digest('hex')
  try {
    db.prepare('UPDATE decisions SET deleted_at = ?, updated_at = ?, etag = ?, updated_by = ? WHERE id = ?').run(now, now, newEtag, userId, decisionId)
  } catch (e) {
    if (String(e).includes('no such column')) {
      db.prepare('UPDATE decisions SET deleted_at = ?, updated_at = ? WHERE id = ?').run(now, now, decisionId)
    } else throw e
  }
  db.prepare(
    `INSERT INTO decision_audit_log (id, decision_id, action, performed_by, performed_at, details) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(crypto.randomUUID(), decisionId, 'deleted', userId, now, '{}')
  res.json({ id: decisionId, deleted: true })
})

// POST /api/decisions/:id/restore - restore soft-deleted decision
decisionsRouter.post('/decisions/:id/restore', requireAuth, (req: Request, res: Response) => {
  const userId = (req as Request & { userId: string }).userId
  const { id: decisionId } = req.params

  const row = db.prepare('SELECT id, project_id, deleted_at FROM decisions WHERE id = ?').get(decisionId)
  if (!row) return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' })
  if (!(row as { deleted_at: string | null }).deleted_at) {
    return res.json({ id: decisionId, restored: true, message: 'Decision is already active' })
  }

  const now = new Date().toISOString()
  const newEtag = crypto.createHash('md5').update(decisionId + now).digest('hex')
  try {
    db.prepare('UPDATE decisions SET deleted_at = NULL, updated_at = ?, etag = ?, updated_by = ? WHERE id = ?').run(now, newEtag, userId, decisionId)
  } catch (e) {
    if (String(e).includes('no such column')) {
      db.prepare('UPDATE decisions SET deleted_at = NULL, updated_at = ? WHERE id = ?').run(now, decisionId)
    } else throw e
  }
  db.prepare(
    `INSERT INTO decision_audit_log (id, decision_id, action, performed_by, performed_at, details) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(crypto.randomUUID(), decisionId, 'restored', userId, now, '{}')
  res.json({ id: decisionId, restored: true })
})

// GET /api/decisions/:id/history - decision audit history
decisionsRouter.get('/decisions/:id/history', requireAuth, (req: Request, res: Response) => {
  const { id: decisionId } = req.params

  const decision = db.prepare('SELECT id FROM decisions WHERE id = ?').get(decisionId)
  if (!decision) return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' })

  const rows = db.prepare(
    'SELECT id, decision_id, action, performed_by, performed_at, details FROM decision_audit_log WHERE decision_id = ? ORDER BY performed_at ASC'
  ).all(decisionId) as { id: string; decision_id: string; action: string; performed_by: string | null; performed_at: string; details: string | null }[]

  res.json({
    entries: rows.map((r) => ({
      id: r.id,
      decisionId: r.decision_id,
      action: r.action,
      performedBy: r.performed_by,
      timestamp: r.performed_at,
      details: r.details ? (JSON.parse(r.details) as Record<string, unknown>) : null,
    })),
  })
})

// POST /api/projects/:projectId/decisions/:decisionId/publish
decisionsRouter.post('/projects/:projectId/decisions/:decisionId/publish', requireAuth, (req: Request, res: Response) => {
  const userId = (req as Request & { userId: string }).userId
  const { projectId, decisionId } = req.params

  const row = db.prepare(
    'SELECT id, status, title FROM decisions WHERE id = ? AND project_id = ?'
  ).get(decisionId, projectId) as { id: string; status: string; title: string } | undefined

  if (!row) return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' })
  if (row.status === 'published') {
    return res.json({ decisionId, status: 'published', clientLink: `/client/mock-token-${decisionId}` })
  }

  const optCount = db.prepare('SELECT COUNT(*) as c FROM decision_options WHERE decision_id = ?').get(decisionId) as { c: number }
  if (optCount.c < 1) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'At least one option is required to publish' })
  }

  const now = new Date().toISOString()
  db.prepare('UPDATE decisions SET status = ?, updated_at = ? WHERE id = ?').run('pending', now, decisionId)

  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHmac('sha256', process.env.HMAC_SECRET ?? 'archject-client-token-secret').update(token).digest('hex')
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
  db.prepare(
    'INSERT INTO client_tokens (id, project_id, decision_ids, scope, token_hash, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(crypto.randomUUID(), projectId, JSON.stringify([decisionId]), 'read_approve', tokenHash, expiresAt)

  db.prepare(
    `INSERT INTO decision_audit_log (id, decision_id, action, performed_by, performed_at, details)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(crypto.randomUUID(), decisionId, 'published', userId, now, JSON.stringify({ clientLink: true }))

  const baseUrl = (req.get('x-forwarded-proto') || req.protocol) + '://' + (req.get('x-forwarded-host') || req.get('host') || 'localhost:3001')
  const clientLink = `${baseUrl}/client/${token}`

  res.json({ decisionId, status: 'published', clientLink })
})

// POST /api/decisions/:decisionId/clone - clone decision into new draft
decisionsRouter.post('/decisions/:decisionId/clone', requireAuth, (req: Request, res: Response) => {
  const userId = (req as Request & { userId: string }).userId
  const { decisionId: sourceId } = req.params
  const { projectId } = req.body as { projectId?: string }

  const source = db.prepare(
    'SELECT id, project_id, title, description, type, account_id FROM decisions WHERE id = ? AND (deleted_at IS NULL OR deleted_at = \'\')'
  ).get(sourceId) as { id: string; project_id: string; title: string; description: string | null; type: string; account_id: string | null } | undefined

  if (!source) return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' })
  const targetProjectId = projectId ?? source.project_id

  const newId = crypto.randomUUID()
  const now = new Date().toISOString()
  const etag = crypto.createHash('md5').update(newId + now).digest('hex')

  try {
    db.prepare(
      `INSERT INTO decisions (id, project_id, account_id, title, type, status, created_at, updated_at, created_by, etag, version, cloned_from_decision_id, version_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 1)`
    ).run(newId, targetProjectId, source.account_id, source.title + ' (Copy)', source.type, 'draft', now, now, userId, etag, sourceId)
  } catch (e) {
    if (String(e).includes('no such column')) {
      db.prepare(
        `INSERT INTO decisions (id, project_id, account_id, title, type, status, created_at, updated_at, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(newId, targetProjectId, source.account_id, source.title + ' (Copy)', source.type, 'draft', now, now, userId)
    } else throw e
  }

  type OptRow = { id: string; title: string; description: string | null; is_default: number; is_recommended: number; sort_order: number; image_url?: string; drawing_ids?: string; cost_impact?: string }
  let opts: OptRow[]
  try {
    opts = db.prepare(
      'SELECT id, title, description, is_default, is_recommended, sort_order, image_url, drawing_ids, cost_impact FROM decision_options WHERE decision_id = ? ORDER BY sort_order'
    ).all(sourceId) as OptRow[]
  } catch {
    opts = db.prepare(
      'SELECT id, title, description, is_default, is_recommended, sort_order FROM decision_options WHERE decision_id = ? ORDER BY sort_order'
    ).all(sourceId) as OptRow[]
  }

  for (let i = 0; i < opts.length; i++) {
    const o = opts[i]
    const optId = crypto.randomUUID()
    try {
      db.prepare(
        `INSERT INTO decision_options (id, decision_id, title, description, is_default, is_recommended, sort_order, image_url, drawing_ids, cost_impact)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(optId, newId, o.title, o.description ?? null, o.is_default, o.is_recommended, i, o.image_url ?? null, o.drawing_ids ?? null, o.cost_impact ?? null)
    } catch {
      db.prepare(
        `INSERT INTO decision_options (id, decision_id, title, description, is_default, is_recommended, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(optId, newId, o.title, o.description ?? null, o.is_default, o.is_recommended, i)
    }
  }

  db.prepare(
    `INSERT INTO decision_audit_log (id, decision_id, action, performed_by, performed_at, details)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(crypto.randomUUID(), newId, 'cloned', userId, now, JSON.stringify({ fromDecisionId: sourceId }))

  res.status(201).json({ decisionId: newId, clonedFrom: sourceId, projectId: targetProjectId, status: 'draft' })
})

// POST /api/decisions/:decisionId/archive - archive decision (soft archive, distinct from soft delete)
decisionsRouter.post('/decisions/:decisionId/archive', requireAuth, (req: Request, res: Response) => {
  const userId = (req as Request & { userId: string }).userId
  const { decisionId } = req.params

  const row = db.prepare(
    'SELECT id, project_id FROM decisions WHERE id = ? AND (deleted_at IS NULL OR deleted_at = \'\')'
  ).get(decisionId) as { id: string; project_id: string } | undefined

  if (!row) return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' })

  const now = new Date().toISOString()

  try {
    db.prepare('UPDATE decisions SET is_archived = 1, archived_at = ?, archived_by = ?, updated_at = ? WHERE id = ?').run(now, userId, now, decisionId)
  } catch (e) {
    if (String(e).includes('no such column')) {
      db.prepare('UPDATE decisions SET deleted_at = ?, updated_at = ? WHERE id = ?').run(now, now, decisionId)
    } else throw e
  }

  db.prepare(
    `INSERT INTO decision_audit_log (id, decision_id, action, performed_by, performed_at, details)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(crypto.randomUUID(), decisionId, 'archived', userId, now, '{}')

  res.json({ decisionId, archived: true, archivedAt: now })
})

// POST /api/projects/:projectId/decisions/:decisionId/share - get or create client share link
decisionsRouter.post('/projects/:projectId/decisions/:decisionId/share', requireAuth, (req: Request, res: Response) => {
  const { projectId, decisionId } = req.params

  const row = db.prepare(
    'SELECT id, status FROM decisions WHERE id = ? AND project_id = ? AND (deleted_at IS NULL OR deleted_at = \'\')'
  ).get(decisionId, projectId) as { id: string; status: string } | undefined

  if (!row) return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' })

  if (row.status !== 'pending' && row.status !== 'published') {
    db.prepare('UPDATE decisions SET status = ? WHERE id = ?').run('pending', decisionId)
  }

  const tokenPlain = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHmac('sha256', process.env.HMAC_SECRET ?? 'archject-client-token-secret').update(tokenPlain).digest('hex')
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
  db.prepare(
    'INSERT INTO client_tokens (id, project_id, decision_ids, scope, token_hash, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(crypto.randomUUID(), projectId, JSON.stringify([decisionId]), 'read_approve', tokenHash, expiresAt)

  const baseUrl = (req.get('x-forwarded-proto') || req.protocol) + '://' + (req.get('x-forwarded-host') || req.get('host') || 'localhost:3001')
  const clientLink = `${baseUrl}/client/${tokenPlain}`

  res.json({ decisionId, clientLink })
})

// GET /api/projects/:projectId/decisions/:decisionId/comments - internal comments
decisionsRouter.get('/projects/:projectId/decisions/:decisionId/comments', requireAuth, (req: Request, res: Response) => {
  const { projectId, decisionId } = req.params

  const decision = db.prepare('SELECT id FROM decisions WHERE id = ? AND project_id = ?').get(decisionId, projectId)
  if (!decision) return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' })

  let rows: { id: string; decision_id: string; parent_comment_id: string | null; author_id: string; author_name: string | null; content: string; created_at: string }[]
  try {
    rows = db.prepare(
      `SELECT id, decision_id, parent_comment_id, author_id, author_name, content, created_at
       FROM portal_comments WHERE decision_id = ? ORDER BY created_at ASC`
    ).all(decisionId) as typeof rows
  } catch {
    return res.json([])
  }

  res.json(
    rows.map((r) => ({
      id: r.id,
      decisionId: r.decision_id,
      parentCommentId: r.parent_comment_id,
      authorId: r.author_id,
      authorName: r.author_name ?? 'Unknown',
      text: r.content,
      timestamp: r.created_at,
      attachments: [],
    }))
  )
})

// POST /api/projects/:projectId/decisions/:decisionId/comments - internal comment
decisionsRouter.post('/projects/:projectId/decisions/:decisionId/comments', requireAuth, (req: Request, res: Response) => {
  const userId = (req as Request & { userId: string }).userId
  const { projectId, decisionId } = req.params
  const { text, parentCommentId } = req.body as { text?: string; parentCommentId?: string }

  const decision = db.prepare('SELECT id FROM decisions WHERE id = ? AND project_id = ?').get(decisionId, projectId)
  if (!decision) return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' })

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Comment text is required' })
  }

  const userName = db.prepare('SELECT first_name, last_name FROM users WHERE id = ?').get(userId) as { first_name: string; last_name: string } | undefined
  const authorName = userName ? `${userName.first_name} ${userName.last_name}`.trim() : 'User'

  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  try {
    db.prepare(
      `INSERT INTO portal_comments (id, decision_id, parent_comment_id, author_id, author_name, content, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, decisionId, parentCommentId ?? null, userId, authorName, text.trim(), now)
  } catch (e) {
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to save comment' })
  }

  res.status(201).json({
    id,
    decisionId,
    parentCommentId: parentCommentId ?? null,
    authorId: userId,
    authorName,
    text: text.trim(),
    timestamp: now,
    attachments: [],
  })
})

// POST /api/projects/:projectId/decisions/:decisionId/options
decisionsRouter.post('/projects/:projectId/decisions/:decisionId/options', requireAuth, (req: Request, res: Response) => {
  const { projectId, decisionId } = req.params
  const { title, description, isDefault, isRecommended } = req.body as {
    title: string
    description?: string
    isDefault?: boolean
    isRecommended?: boolean
  }

  const row = db.prepare('SELECT id FROM decisions WHERE id = ? AND project_id = ?').get(decisionId, projectId)
  if (!row) return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' })

  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM decision_options WHERE decision_id = ?').get(decisionId) as { next: number }
  const optId = crypto.randomUUID()
  db.prepare(
    `INSERT INTO decision_options (id, decision_id, title, description, is_default, is_recommended, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(optId, decisionId, title ?? 'New option', description ?? null, isDefault ? 1 : 0, isRecommended ? 1 : 0, maxOrder.next)

  res.status(201).json({
    id: optId,
    title: title ?? 'New option',
    description: description ?? undefined,
    isDefault: !!isDefault,
    isRecommended: !!isRecommended,
  })
})

// PUT /api/projects/:projectId/decisions/:decisionId/options/:optionId
decisionsRouter.put('/projects/:projectId/decisions/:decisionId/options/:optionId', requireAuth, (req: Request, res: Response) => {
  const { projectId, decisionId, optionId } = req.params
  const { title, description, isDefault, isRecommended } = req.body

  const row = db.prepare(
    'SELECT id FROM decision_options WHERE id = ? AND decision_id = ?'
  ).get(optionId, decisionId)
  if (!row) return res.status(404).json({ code: 'NOT_FOUND', message: 'Option not found' })

  const project = db.prepare('SELECT id FROM decisions WHERE id = ? AND project_id = ?').get(decisionId, projectId)
  if (!project) return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' })

  const updates: string[] = []
  const params: unknown[] = []
  if (title !== undefined) {
    updates.push('title = ?')
    params.push(title)
  }
  if (description !== undefined) {
    updates.push('description = ?')
    params.push(description)
  }
  if (isDefault !== undefined) {
    updates.push('is_default = ?')
    params.push(isDefault ? 1 : 0)
  }
  if (isRecommended !== undefined) {
    updates.push('is_recommended = ?')
    params.push(isRecommended ? 1 : 0)
  }
  if (updates.length > 0) {
    updates.push('updated_at = ?')
    params.push(new Date().toISOString())
    params.push(optionId)
    db.prepare(`UPDATE decision_options SET ${updates.join(', ')} WHERE id = ?`).run(...params)
  }

  res.json({ id: optionId, status: 'updated' })
})

// DELETE /api/projects/:projectId/decisions/:decisionId - soft delete
decisionsRouter.delete('/projects/:projectId/decisions/:decisionId', requireAuth, (req: Request, res: Response) => {
  const userId = (req as Request & { userId: string }).userId
  const { projectId, decisionId } = req.params

  const row = db.prepare('SELECT id FROM decisions WHERE id = ? AND project_id = ? AND (deleted_at IS NULL OR deleted_at = \'\')').get(decisionId, projectId)
  if (!row) return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' })

  const now = new Date().toISOString()
  try {
    db.prepare('UPDATE decisions SET deleted_at = ?, updated_at = ?, updated_by = ? WHERE id = ?').run(now, now, userId, decisionId)
  } catch (e) {
    if (String(e).includes('no such column')) {
      db.prepare('UPDATE decisions SET deleted_at = ?, updated_at = ? WHERE id = ?').run(now, now, decisionId)
    } else throw e
  }

  db.prepare(
    `INSERT INTO decision_audit_log (id, decision_id, action, performed_by, performed_at, details)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(crypto.randomUUID(), decisionId, 'deleted', userId, now, '{}')

  res.json({ id: decisionId, deleted: true, deletedAt: now })
})

// POST /api/decisions/:id/restore - restore soft-deleted decision
decisionsRouter.post('/decisions/:id/restore', requireAuth, (req: Request, res: Response) => {
  const userId = (req as Request & { userId: string }).userId
  const { id: decisionId } = req.params

  const row = db.prepare('SELECT id, project_id, deleted_at FROM decisions WHERE id = ?').get(decisionId)
  if (!row) return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' })

  const d = row as { id: string; project_id: string; deleted_at: string | null }
  if (!d.deleted_at) {
    return res.status(400).json({ code: 'INVALID_STATE', message: 'Decision is not deleted' })
  }

  const now = new Date().toISOString()
  try {
    db.prepare('UPDATE decisions SET deleted_at = NULL, updated_at = ?, updated_by = ? WHERE id = ?').run(now, userId, decisionId)
  } catch (e) {
    if (String(e).includes('no such column')) {
      db.prepare('UPDATE decisions SET deleted_at = NULL, updated_at = ? WHERE id = ?').run(now, decisionId)
    } else throw e
  }

  db.prepare(
    `INSERT INTO decision_audit_log (id, decision_id, action, performed_by, performed_at, details)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(crypto.randomUUID(), decisionId, 'restored', userId, now, '{}')

  res.json({ id: decisionId, restored: true, updatedAt: now })
})

// GET /api/decisions/:id/history - decision version/audit history
decisionsRouter.get('/decisions/:id/history', requireAuth, (req: Request, res: Response) => {
  const { id: decisionId } = req.params

  const decision = db.prepare('SELECT id FROM decisions WHERE id = ?').get(decisionId)
  if (!decision) return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' })

  const rows = db.prepare(
    'SELECT id, decision_id, action, performed_by, performed_at, details FROM decision_audit_log WHERE decision_id = ? ORDER BY performed_at ASC'
  ).all(decisionId) as { id: string; decision_id: string; action: string; performed_by: string | null; performed_at: string; details: string | null }[]

  const entries = rows.map((r) => {
    let details: Record<string, unknown> | null = null
    if (r.details) {
      try {
        details = JSON.parse(r.details)
      } catch {
        // ignore
      }
    }
    return {
      id: r.id,
      decisionId: r.decision_id,
      action: r.action,
      performedBy: r.performed_by,
      timestamp: r.performed_at,
      details,
    }
  })

  res.json({ entries })
})

// DELETE /api/projects/:projectId/decisions/:decisionId - soft delete
decisionsRouter.delete('/projects/:projectId/decisions/:decisionId', requireAuth, (req: Request, res: Response) => {
  const { projectId, decisionId } = req.params

  const row = db.prepare('SELECT id, deleted_at FROM decisions WHERE id = ? AND project_id = ?').get(decisionId, projectId)
  if (!row) return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' })
  if ((row as { deleted_at: string | null }).deleted_at) {
    return res.status(400).json({ code: 'INVALID_STATE', message: 'Decision is already archived' })
  }

  const now = new Date().toISOString()
  try {
    db.prepare('UPDATE decisions SET deleted_at = ?, updated_at = ? WHERE id = ?').run(now, now, decisionId)
  } catch {
    db.prepare('UPDATE decisions SET deleted_at = ? WHERE id = ?').run(now, decisionId)
  }

  res.json({ id: decisionId, deletedAt: now })
})

// POST /api/decisions/:decisionId/restore - restore soft-deleted decision
decisionsRouter.post('/decisions/:decisionId/restore', requireAuth, (req: Request, res: Response) => {
  const { decisionId } = req.params

  const row = db.prepare('SELECT id, project_id, deleted_at FROM decisions WHERE id = ?').get(decisionId)
  if (!row) return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' })
  if (!(row as { deleted_at: string | null }).deleted_at) {
    return res.status(400).json({ code: 'INVALID_STATE', message: 'Decision is not archived' })
  }

  const now = new Date().toISOString()
  try {
    db.prepare('UPDATE decisions SET deleted_at = NULL, updated_at = ? WHERE id = ?').run(now, decisionId)
  } catch {
    db.prepare('UPDATE decisions SET deleted_at = NULL WHERE id = ?').run(decisionId)
  }

  res.json({ id: decisionId, restored: true })
})

// GET /api/projects/:projectId/decisions/:decisionId/history - decision history/audit log
decisionsRouter.get('/projects/:projectId/decisions/:decisionId/history', requireAuth, (req: Request, res: Response) => {
  const { projectId, decisionId } = req.params

  const decision = db.prepare('SELECT id FROM decisions WHERE id = ? AND project_id = ?').get(decisionId, projectId)
  if (!decision) return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' })

  const rows = db.prepare(
    'SELECT id, action, performed_by, performed_at, details FROM decision_audit_log WHERE decision_id = ? ORDER BY performed_at ASC'
  ).all(decisionId) as { id: string; action: string; performed_by: string | null; performed_at: string; details: string | null }[]

  const history = rows.map((r) => {
    let details: Record<string, unknown> = {}
    if (r.details) {
      try {
        details = JSON.parse(r.details)
      } catch {
        // ignore
      }
    }
    return {
      id: r.id,
      version: 0,
      action: r.action,
      performedBy: r.performed_by ?? undefined,
      performedAt: r.performed_at,
      details,
    }
  })

  res.json({ items: history })
})
