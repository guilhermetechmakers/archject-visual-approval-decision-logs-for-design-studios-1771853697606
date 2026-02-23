import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
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

const NOTIFICATION_TYPES = ['reminder', 'approval', 'comment', 'export'] as const
const FREQUENCIES = ['immediate', 'daily_digest', 'weekly_digest'] as const

const notificationsFeedRouter = Router()

/**
 * GET /api/notifications/summary
 * Returns unread count for header bell.
 */
notificationsFeedRouter.get('/summary', requireAuth, (req: Request, res: Response) => {
  const userId = (req as Request & { userId: string }).userId
  const row = db.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_at IS NULL'
  ).get(userId) as { count: number }
  res.json({ unreadCount: row?.count ?? 0 })
})

/**
 * GET /api/notifications
 * List notifications with filters
 */
notificationsFeedRouter.get('/', requireAuth, (req: Request, res: Response) => {
  const userId = (req as Request & { userId: string }).userId
  const type = (req.query.type as string)?.trim()
  const readStatus = (req.query.read_status as string)?.trim()
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '20', 10)))
  const offset = (page - 1) * limit

  let where = 'user_id = ?'
  const params: unknown[] = [userId]

  if (type && NOTIFICATION_TYPES.includes(type as (typeof NOTIFICATION_TYPES)[number])) {
    where += ' AND type = ?'
    params.push(type)
  }
  if (readStatus === 'read') {
    where += ' AND read_at IS NOT NULL'
  } else if (readStatus === 'unread') {
    where += ' AND read_at IS NULL'
  }

  const countRow = db.prepare(`SELECT COUNT(*) as c FROM notifications WHERE ${where}`).get(...params) as { c: number }
  const total = countRow?.c ?? 0

  const rows = db.prepare(
    `SELECT id, user_id, type, title, message, related_decision_id, related_project_id, read_at, created_at, source, attachments_json
     FROM notifications WHERE ${where}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  ).all(...params, limit, offset) as {
    id: string
    user_id: string
    type: string
    title: string
    message: string
    related_decision_id: string | null
    related_project_id: string | null
    read_at: string | null
    created_at: string
    source: string
    attachments_json: string | null
  }[]

  const items = rows.map((r) => {
    let attachments: string[] = []
    if (r.attachments_json) {
      try {
        attachments = JSON.parse(r.attachments_json)
      } catch {
        // ignore
      }
    }
    return {
      id: r.id,
      userId: r.user_id,
      type: r.type,
      title: r.title,
      message: r.message,
      relatedDecisionId: r.related_decision_id,
      relatedProjectId: r.related_project_id,
      readAt: r.read_at,
      createdAt: r.created_at,
      source: r.source,
      attachments,
    }
  })

  res.json({ items, total, page, limit })
})

/**
 * POST /api/notifications/mark-read
 */
notificationsFeedRouter.post('/mark-read', requireAuth, (req: Request, res: Response) => {
  const userId = (req as Request & { userId: string }).userId
  const { notification_ids: notificationIds } = req.body as { notification_ids?: string[] }
  const now = new Date().toISOString()

  if (Array.isArray(notificationIds) && notificationIds.length > 0) {
    const placeholders = notificationIds.map(() => '?').join(',')
    const stmt = db.prepare(
      `UPDATE notifications SET read_at = ? WHERE user_id = ? AND id IN (${placeholders})`
    )
    stmt.run(now, userId, ...notificationIds)
  } else {
    db.prepare('UPDATE notifications SET read_at = ? WHERE user_id = ?').run(now, userId)
  }

  res.json({ success: true })
})

/**
 * POST /api/notifications/mark-unread
 */
notificationsFeedRouter.post('/mark-unread', requireAuth, (req: Request, res: Response) => {
  const userId = (req as Request & { userId: string }).userId
  const { notification_ids: notificationIds } = req.body as { notification_ids?: string[] }

  if (Array.isArray(notificationIds) && notificationIds.length > 0) {
    const placeholders = notificationIds.map(() => '?').join(',')
    const stmt = db.prepare(
      `UPDATE notifications SET read_at = NULL WHERE user_id = ? AND id IN (${placeholders})`
    )
    stmt.run(userId, ...notificationIds)
  } else {
    db.prepare('UPDATE notifications SET read_at = NULL WHERE user_id = ?').run(userId)
  }

  res.json({ success: true })
})

/**
 * POST /api/notifications/mute
 */
notificationsFeedRouter.post('/mute', requireAuth, (req: Request, res: Response) => {
  const userId = (req as Request & { userId: string }).userId
  const { project_id: projectId } = req.body as { project_id?: string }
  if (!projectId || typeof projectId !== 'string') {
    res.status(400).json({ code: 'VALIDATION_ERROR', message: 'project_id is required' })
    return
  }
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  try {
    db.prepare(
      'INSERT INTO notification_mutes (id, user_id, project_id, muted_at) VALUES (?, ?, ?, ?)'
    ).run(id, userId, projectId, now)
  } catch (e) {
    if (String(e).includes('UNIQUE')) {
      res.json({ success: true, alreadyMuted: true })
      return
    }
    throw e
  }
  res.json({ success: true })
})

/**
 * POST /api/notifications/trigger-test - preview reminder template with sample data
 */
notificationsFeedRouter.post('/trigger-test', requireAuth, (req: Request, res: Response) => {
  const { template_id } = req.body as { template_id?: string }
  const template = db.prepare(
    'SELECT id, subject, body_html, placeholders_json FROM reminder_templates WHERE id = ?'
  ).get(template_id || '') as { id: string; subject: string; body_html: string; placeholders_json: string } | undefined

  if (!template) {
    res.status(404).json({ code: 'NOT_FOUND', message: 'Template not found' })
    return
  }

  const placeholders = (() => {
    try {
      return JSON.parse(template.placeholders_json || '[]') as string[]
    } catch {
      return []
    }
  })()
  const sample: Record<string, string> = {
    decision_title: 'Sample Material Selection',
    deadline: new Date(Date.now() + 86400000 * 7).toLocaleDateString(),
    client_name: 'Client Name',
  }
  let subject = template.subject
  let bodyHtml = template.body_html
  for (const p of placeholders) {
    const val = sample[p] ?? `{${p}}`
    subject = subject.replace(new RegExp(`\\{${p}\\}`, 'g'), val)
    bodyHtml = bodyHtml.replace(new RegExp(`\\{${p}\\}`, 'g'), val)
  }

  res.json({ subject, bodyHtml })
})

const notificationSettingsRouter = Router()

/**
 * GET /api/notification-settings
 */
notificationSettingsRouter.get('/', requireAuth, (req: Request, res: Response) => {
  const userId = (req as Request & { userId: string }).userId
  const row = db.prepare(
    'SELECT id, user_id, in_app_enabled, email_enabled, default_frequency, per_project_settings_json, last_updated FROM notification_settings WHERE user_id = ?'
  ).get(userId) as {
    id: string
    user_id: string
    in_app_enabled: number
    email_enabled: number
    default_frequency: string
    per_project_settings_json: string
    last_updated: string
  } | undefined

  if (!row) {
    res.json({
      id: '',
      userId,
      inAppEnabled: true,
      emailEnabled: true,
      defaultFrequency: 'immediate',
      perProjectSettings: [],
      lastUpdated: new Date().toISOString(),
    })
    return
  }

  let perProjectSettings: { projectId: string; projectName?: string; inAppEnabled: boolean; emailEnabled: boolean; frequency: string }[] = []
  if (row.per_project_settings_json) {
    try {
      perProjectSettings = JSON.parse(row.per_project_settings_json)
    } catch {
      // ignore
    }
  }

  res.json({
    id: row.id,
    userId: row.user_id,
    inAppEnabled: !!row.in_app_enabled,
    emailEnabled: !!row.email_enabled,
    defaultFrequency: row.default_frequency || 'immediate',
    perProjectSettings,
    lastUpdated: row.last_updated,
  })
})

/**
 * PUT /api/notification-settings
 */
notificationSettingsRouter.put('/', requireAuth, (req: Request, res: Response) => {
  const userId = (req as Request & { userId: string }).userId
  const body = req.body as {
    inAppEnabled?: boolean
    emailEnabled?: boolean
    defaultFrequency?: string
    perProjectSettings?: { projectId: string; projectName?: string; inAppEnabled: boolean; emailEnabled: boolean; frequency: string }[]
  }

  const inAppEnabled = body.inAppEnabled ?? true
  const emailEnabled = body.emailEnabled ?? true
  const defaultFrequency = FREQUENCIES.includes((body.defaultFrequency as (typeof FREQUENCIES)[number]) ?? '') ? body.defaultFrequency : 'immediate'
  const perProjectSettings = Array.isArray(body.perProjectSettings) ? body.perProjectSettings : []

  if (!inAppEnabled && !emailEnabled) {
    res.status(400).json({ code: 'VALIDATION_ERROR', message: 'At least one channel must be enabled' })
    return
  }

  const now = new Date().toISOString()
  const perProjectJson = JSON.stringify(perProjectSettings)

  const existing = db.prepare('SELECT id FROM notification_settings WHERE user_id = ?').get(userId) as { id: string } | undefined
  if (existing) {
    db.prepare(
      'UPDATE notification_settings SET in_app_enabled = ?, email_enabled = ?, default_frequency = ?, per_project_settings_json = ?, last_updated = ? WHERE user_id = ?'
    ).run(inAppEnabled ? 1 : 0, emailEnabled ? 1 : 0, defaultFrequency, perProjectJson, now, userId)
  } else {
    const id = crypto.randomUUID()
    db.prepare(
      'INSERT INTO notification_settings (id, user_id, in_app_enabled, email_enabled, default_frequency, per_project_settings_json, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, userId, inAppEnabled ? 1 : 0, emailEnabled ? 1 : 0, defaultFrequency, perProjectJson, now)
  }

  res.json({ success: true })
})

const reminderTemplatesRouter = Router()

/**
 * GET /api/reminder-templates
 */
reminderTemplatesRouter.get('/', requireAuth, (_req: Request, res: Response) => {
  const rows = db.prepare(
    'SELECT id, name, subject, body_html, body_text, placeholders_json, updated_at FROM reminder_templates ORDER BY name'
  ).all() as {
    id: string
    name: string
    subject: string
    body_html: string
    body_text: string
    placeholders_json: string
    updated_at: string
  }[]

  const items = rows.map((r) => {
    let placeholders: string[] = []
    if (r.placeholders_json) {
      try {
        placeholders = JSON.parse(r.placeholders_json)
      } catch {
        // ignore
      }
    }
    return {
      id: r.id,
      name: r.name,
      subject: r.subject,
      bodyHtml: r.body_html,
      bodyText: r.body_text,
      placeholders,
      updatedAt: r.updated_at,
    }
  })

  res.json(items)
})

/**
 * PUT /api/reminder-templates/:id
 */
reminderTemplatesRouter.put('/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params
  const body = req.body as { name?: string; subject?: string; bodyHtml?: string; bodyText?: string; placeholders?: string[] }
  const now = new Date().toISOString()

  const existing = db.prepare('SELECT id FROM reminder_templates WHERE id = ?').get(id)
  if (!existing) {
    res.status(404).json({ code: 'NOT_FOUND', message: 'Template not found' })
    return
  }

  const name = body.name ?? 'Default Reminder'
  const subject = body.subject ?? ''
  const bodyHtml = body.bodyHtml ?? ''
  const bodyText = body.bodyText ?? ''
  const placeholders = Array.isArray(body.placeholders) ? body.placeholders : ['decision_title', 'deadline', 'client_name']

  if (!subject.trim() || !bodyHtml.trim()) {
    res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Subject and body are required' })
    return
  }

  db.prepare(
    'UPDATE reminder_templates SET name = ?, subject = ?, body_html = ?, body_text = ?, placeholders_json = ?, updated_at = ? WHERE id = ?'
  ).run(name, subject, bodyHtml, bodyText, JSON.stringify(placeholders), now, id)

  res.json({ success: true })
})

const notificationsRouter = Router()
notificationsRouter.use('/notifications', notificationsFeedRouter)
notificationsRouter.use('/notification-settings', notificationSettingsRouter)
notificationsRouter.use('/reminder-templates', reminderTemplatesRouter)

export { notificationsRouter, notificationsFeedRouter, notificationSettingsRouter, reminderTemplatesRouter }
