import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
const ADMIN_JWT_EXPIRY = '15m'

type AdminRole = 'super-admin' | 'admin' | 'support' | 'read-only'

interface AdminJwtPayload {
  sub: string
  email: string
  role: AdminRole
  type: 'admin'
}

function getAdminFromToken(req: Request): AdminJwtPayload | null {
  const auth = req.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET) as AdminJwtPayload
    if (decoded.type !== 'admin') return null
    return decoded
  } catch {
    return null
  }
}

function requireAdmin(roles?: AdminRole[]) {
  return (req: Request, res: Response, next: () => void) => {
    const admin = getAdminFromToken(req)
    if (!admin) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Admin authentication required' })
    }
    const row = db.prepare('SELECT is_active FROM admin_users WHERE id = ?').get(admin.sub) as { is_active: number } | undefined
    if (!row || !row.is_active) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Admin account inactive' })
    }
    ;(req as Request & { admin: AdminJwtPayload }).admin = admin
    if (roles && !roles.includes(admin.role)) {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
    }
    next()
  }
}

function auditLog(actorId: string, actionType: string, targetType: string, targetId: string | null, beforeData: string | null, afterData: string | null, ip: string | null) {
  try {
    db.prepare(
      `INSERT INTO audit_logs (id, actor_id, action_type, target_type, target_id, before_data, after_data, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(crypto.randomUUID(), actorId, actionType, targetType, targetId ?? '', beforeData, afterData, ip)
  } catch (e) {
    console.error('[Audit]', e)
  }
}

function seedAdminIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) as c FROM admin_users').get() as { c: number }
  if (count.c === 0) {
    const id = crypto.randomUUID()
    const hash = bcrypt.hashSync('admin123', 10)
    db.prepare(
      `INSERT INTO admin_users (id, email, name, role, password_hash, is_active)
       VALUES (?, 'admin@archject.local', 'Admin', 'super-admin', ?, 1)`
    ).run(id, hash)
    console.log('[Admin] Seeded default admin: admin@archject.local / admin123')
  }
}

export const adminRouter = Router()

adminRouter.post('/login', async (req: Request, res: Response) => {
  try {
    seedAdminIfEmpty()
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Email and password required' })
    }
    const admin = db.prepare('SELECT * FROM admin_users WHERE email = ? AND is_active = 1').get(email) as
      | { id: string; email: string; name: string; role: string; password_hash: string }
      | undefined
    if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
      return res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' })
    }
    const token = jwt.sign(
      { sub: admin.id, email: admin.email, role: admin.role, type: 'admin' } as AdminJwtPayload,
      JWT_SECRET,
      { expiresIn: ADMIN_JWT_EXPIRY }
    )
    return res.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } })
  } catch (err) {
    console.error('[Admin] Login error:', err)
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' })
  }
})

adminRouter.get('/metrics/summary', requireAdmin(), (_req: Request, res: Response) => {
  try {
    const studios = db.prepare('SELECT COUNT(*) as c FROM studios').get() as { c: number }
    const approvals = db.prepare('SELECT COUNT(*) as c FROM analytics_daily_aggregates').get() as { c: number }
    const agg = db.prepare(
      'SELECT SUM(approvals_count) as total, AVG(avg_turnaround_seconds) as avg FROM analytics_daily_aggregates WHERE date >= date("now", "-7 days")'
    ).get() as { total: number | null; avg: number | null }
    res.json({
      activeStudios: studios?.c ?? 0,
      dailyApprovals: agg?.total ?? 0,
      avgTurnaroundSeconds: Math.round(agg?.avg ?? 0),
      platformErrorRate: 0.12,
    })
  } catch (e) {
    console.error('[Admin] metrics/summary:', e)
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' })
  }
})

adminRouter.get('/metrics/series', requireAdmin(), (req: Request, res: Response) => {
  const metric = (req.query.metric as string) || 'approvals'
  const range = parseInt((req.query.range as string) || '30', 10) || 30
  const days = Math.min(Math.max(range, 7), 90)
  const series: { date: string; value: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    series.push({ date: dateStr, value: Math.floor(Math.random() * 50) + 10 })
  }
  res.json({ series })
})

adminRouter.get('/health', requireAdmin(), (_req: Request, res: Response) => {
  const services = [
    { id: 's3', name: 'S3 Storage', status: 'healthy' as const, lastChecked: new Date().toISOString(), message: null },
    { id: 'email', name: 'Email Provider', status: 'degraded' as const, lastChecked: new Date().toISOString(), message: 'High latency' },
    { id: 'forge', name: 'Forge/Hosting', status: 'healthy' as const, lastChecked: new Date().toISOString(), message: null },
    { id: 'db', name: 'Database Queue', status: 'healthy' as const, lastChecked: new Date().toISOString(), message: null },
  ]
  res.json({ services, overall: 'degraded' })
})

adminRouter.post('/health/check', requireAdmin(), (req: Request, res: Response) => {
  const service = req.query.service as string
  const status = service === 'email' ? 'degraded' : 'healthy'
  res.json({ service: service || 'all', status, lastChecked: new Date().toISOString() })
})

adminRouter.get('/users', requireAdmin(), (req: Request, res: Response) => {
  const q = (req.query.q as string) || ''
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10))
  const perPage = Math.min(100, Math.max(1, parseInt((req.query.perPage as string) || '20', 10)))
  let where = '1=1'
  const params: unknown[] = []
  if (q) {
    where += ' AND (email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)'
    const like = `%${q}%`
    params.push(like, like, like)
  }
  const countRow = db.prepare(`SELECT COUNT(*) as c FROM users WHERE ${where}`).get(...params) as { c: number }
  const rows = db.prepare(
    `SELECT id, first_name, last_name, email, company, created_at FROM users WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, perPage, (page - 1) * perPage) as { id: string; first_name: string; last_name: string; email: string; company: string | null; created_at: string }[]
  const users = rows.map((r) => ({
    id: r.id,
    email: r.email,
    name: `${r.first_name} ${r.last_name}`,
    studioId: r.company || null,
    status: 'active' as const,
    role: 'member' as const,
    lastLoginAt: null,
    createdAt: r.created_at,
  }))
  res.json({ users, total: countRow.c, page, perPage })
})

adminRouter.patch('/users/:id', requireAdmin(['super-admin', 'admin']), (req: Request, res: Response) => {
  const { id } = req.params
  const { status, role } = req.body
  const admin = (req as Request & { admin: AdminJwtPayload }).admin
  const before = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!before) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found' })
  if (status) {
    db.prepare('UPDATE users SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), id)
  }
  auditLog(admin.sub, 'user_update', 'user', id, JSON.stringify(before), JSON.stringify({ status, role }), req.ip)
  res.json({ id, status: status || 'active', role: role || 'member' })
})

adminRouter.post('/users/invite', requireAdmin(['super-admin', 'admin']), (req: Request, res: Response) => {
  const { email, studioId, role } = req.body
  if (!email) return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Email required' })
  const admin = (req as Request & { admin: AdminJwtPayload }).admin
  const inviteId = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  db.prepare(
    `INSERT INTO user_invites (id, email, studio_id, role, status, invited_by, expires_at) VALUES (?, ?, ?, ?, 'pending', ?, ?)`
  ).run(inviteId, email, studioId || null, role || 'member', admin.sub, expiresAt.toISOString())
  auditLog(admin.sub, 'user_invite', 'invite', inviteId, null, JSON.stringify({ email, studioId, role }), req.ip)
  res.status(201).json({ id: inviteId, email, status: 'pending' })
})

adminRouter.get('/sessions', requireAdmin(), (req: Request, res: Response) => {
  const userId = req.query.userId as string | undefined
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10))
  const perPage = 20
  let where = '1=1'
  const params: unknown[] = []
  if (userId) {
    where += ' AND admin_id = ?'
    params.push(userId)
  }
  const countRow = db.prepare(`SELECT COUNT(*) as c FROM admin_sessions WHERE ${where}`).get(...params) as { c: number }
  const rows = db.prepare(
    `SELECT session_id, admin_id, device, ip, last_active_at FROM admin_sessions WHERE ${where} ORDER BY last_active_at DESC LIMIT ? OFFSET ?`
  ).all(...params, perPage, (page - 1) * perPage) as { session_id: string; admin_id: string; device: string | null; ip: string | null; last_active_at: string }[]
  const sessions = rows.map((r) => ({
    sessionId: r.session_id,
    userId: r.admin_id,
    device: r.device || 'Unknown',
    ip: r.ip || '—',
    lastActiveAt: r.last_active_at,
  }))
  res.json({ sessions, total: countRow.c, page, perPage })
})

adminRouter.delete('/sessions/:sessionId', requireAdmin(), (req: Request, res: Response) => {
  const { sessionId } = req.params
  db.prepare('DELETE FROM admin_sessions WHERE session_id = ?').run(sessionId)
  res.json({ success: true })
})

adminRouter.post('/sessions/revoke-all', requireAdmin(), (req: Request, res: Response) => {
  const userId = req.query.userId as string
  if (!userId) return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'userId required' })
  db.prepare('DELETE FROM admin_sessions WHERE admin_id = ?').run(userId)
  res.json({ success: true })
})

adminRouter.get('/tickets', requireAdmin(), (req: Request, res: Response) => {
  const status = req.query.status as string | undefined
  const priority = req.query.priority as string | undefined
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10))
  const perPage = 20
  let where = '1=1'
  const params: unknown[] = []
  if (status) {
    where += ' AND status = ?'
    params.push(status)
  }
  if (priority) {
    where += ' AND priority = ?'
    params.push(priority)
  }
  const countRow = db.prepare(`SELECT COUNT(*) as c FROM support_tickets WHERE ${where}`).get(...params) as { c: number }
  const rows = db.prepare(
    `SELECT id, project_id, subject, status, priority, assigned_admin_id, created_at, updated_at FROM support_tickets WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, perPage, (page - 1) * perPage) as { id: string; project_id: string | null; subject: string; status: string; priority: string; assigned_admin_id: string | null; created_at: string; updated_at: string }[]
  const tickets = rows.map((r) => ({
    id: r.id,
    projectId: r.project_id,
    subject: r.subject,
    status: r.status,
    priority: r.priority,
    assignedAdminId: r.assigned_admin_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))
  res.json({ tickets, total: countRow.c, page, perPage })
})

adminRouter.get('/tickets/:id', requireAdmin(), (req: Request, res: Response) => {
  const { id } = req.params
  const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!ticket) return res.status(404).json({ code: 'NOT_FOUND', message: 'Ticket not found' })
  const messages = db.prepare('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at').all(id) as Record<string, unknown>[]
  res.json({ ...ticket, messages })
})

adminRouter.post('/tickets/:id/reply', requireAdmin(), (req: Request, res: Response) => {
  const { id } = req.params
  const { body, internalNote } = req.body
  if (!body) return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'body required' })
  const admin = (req as Request & { admin: AdminJwtPayload }).admin
  const msgId = crypto.randomUUID()
  db.prepare(
    `INSERT INTO ticket_messages (id, ticket_id, author_id, body, internal_note) VALUES (?, ?, ?, ?, ?)`
  ).run(msgId, id, admin.sub, body, internalNote ? 1 : 0)
  db.prepare('UPDATE support_tickets SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), id)
  res.status(201).json({ id: msgId, body, internalNote: !!internalNote })
})

adminRouter.patch('/tickets/:id', requireAdmin(), (req: Request, res: Response) => {
  const { id } = req.params
  const { assign, status } = req.body
  const admin = (req as Request & { admin: AdminJwtPayload }).admin
  const updates: string[] = []
  const params: unknown[] = []
  if (assign !== undefined) {
    updates.push('assigned_admin_id = ?')
    params.push(assign)
  }
  if (status !== undefined) {
    updates.push('status = ?')
    params.push(status)
  }
  if (updates.length === 0) return res.json({ id })
  updates.push('updated_at = ?')
  params.push(new Date().toISOString(), id)
  db.prepare(`UPDATE support_tickets SET ${updates.join(', ')} WHERE id = ?`).run(...params)
  auditLog(admin.sub, 'ticket_update', 'ticket', id, null, JSON.stringify({ assign, status }), req.ip)
  res.json({ id, assign, status })
})

adminRouter.get('/audit-logs', requireAdmin(), (req: Request, res: Response) => {
  const actor = req.query.actor as string | undefined
  const action = req.query.action as string | undefined
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10))
  const perPage = 20
  let where = '1=1'
  const params: unknown[] = []
  if (actor) {
    where += ' AND actor_id = ?'
    params.push(actor)
  }
  if (action) {
    where += ' AND action_type = ?'
    params.push(action)
  }
  const countRow = db.prepare(`SELECT COUNT(*) as c FROM audit_logs WHERE ${where}`).get(...params) as { c: number }
  const rows = db.prepare(
    `SELECT * FROM audit_logs WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, perPage, (page - 1) * perPage)
  res.json({ logs: rows, total: countRow.c, page, perPage })
})

adminRouter.post('/exports', requireAdmin(), (req: Request, res: Response) => {
  const admin = (req as Request & { admin: AdminJwtPayload }).admin
  const { type, params, scheduledCron } = req.body
  const id = crypto.randomUUID()
  db.prepare(
    `INSERT INTO exports (id, requested_by, type, params, status, scheduled_cron) VALUES (?, ?, ?, ?, 'pending', ?)`
  ).run(id, admin.sub, type || 'csv', params ? JSON.stringify(params) : null, scheduledCron || null)
  res.status(201).json({ id, status: 'pending', type: type || 'csv' })
})

adminRouter.get('/exports/:id', requireAdmin(), (req: Request, res: Response) => {
  const { id } = req.params
  const row = db.prepare('SELECT * FROM exports WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!row) return res.status(404).json({ code: 'NOT_FOUND', message: 'Export not found' })
  res.json(row)
})

adminRouter.post('/exports/:id/run-now', requireAdmin(), (req: Request, res: Response) => {
  const { id } = req.params
  db.prepare('UPDATE exports SET status = ?, last_run_at = ? WHERE id = ?').run('processing', new Date().toISOString(), id)
  res.json({ id, status: 'processing' })
})

adminRouter.get('/analytics/approvals', requireAdmin(), (req: Request, res: Response) => {
  const groupBy = (req.query.groupBy as string) || 'studio'
  const from = req.query.from as string
  const to = req.query.to as string
  const data = [
    { group: 'Studio A', approvals: 120, avgTurnaround: 2.4 },
    { group: 'Studio B', approvals: 85, avgTurnaround: 3.1 },
    { group: 'Studio C', approvals: 64, avgTurnaround: 1.8 },
  ]
  res.json({ groupBy, from, to, data })
})

adminRouter.get('/analytics/bottlenecks', requireAdmin(), (req: Request, res: Response) => {
  const from = req.query.from as string
  const to = req.query.to as string
  const studioId = req.query.studioId as string
  res.json({ from, to, studioId, bottlenecks: [] })
})

adminRouter.post('/maintenance-mode', requireAdmin(['super-admin']), (req: Request, res: Response) => {
  const row = db.prepare('SELECT enabled FROM maintenance_mode WHERE id = 1').get() as { enabled: number } | undefined
  const enabled = row?.enabled ?? 0
  const next = enabled ? 0 : 1
  db.prepare('UPDATE maintenance_mode SET enabled = ?, updated_at = datetime("now") WHERE id = 1').run(next)
  res.json({ enabled: next === 1 })
})

export { seedAdminIfEmpty }
