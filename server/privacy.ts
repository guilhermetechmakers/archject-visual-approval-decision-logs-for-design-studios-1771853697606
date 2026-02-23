import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { db } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
const HOLD_WINDOW_DAYS = 14
const EXPORT_EXPIRY_HOURS = 72

function authMiddleware(req: Request, res: Response, next: () => void) {
  const auth = req.get('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' })
  }
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET) as { sub: string }
    ;(req as Request & { userId?: string }).userId = decoded.sub
    next()
  } catch {
    return res.status(401).json({ message: 'Unauthorized' })
  }
}

function auditLog(actorId: string | null, actionType: string, targetType: string | null, targetId: string | null, metadata?: Record<string, unknown>) {
  const id = crypto.randomUUID()
  db.prepare(
    'INSERT INTO audit_logs (id, actor_id, action_type, target_type, target_id, metadata) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, actorId, actionType, targetType, targetId, metadata ? JSON.stringify(metadata) : null)
}

function parseJson<T>(str: string | null): T | null {
  if (!str) return null
  try {
    return JSON.parse(str) as T
  } catch {
    return null
  }
}

export const privacyRouter = Router()

// POST /api/v1/privacy/exports - create export job
privacyRouter.post('/v1/privacy/exports', authMiddleware, (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId?: string }).userId
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    const { formats = ['json', 'csv', 'pdf'], include = ['decisions', 'projects', 'comments', 'attachments'] } = req.body ?? {}
    const validFormats = ['json', 'csv', 'pdf', 'zip']
    const validInclude = ['decisions', 'projects', 'comments', 'attachments']
    const formatsArr = Array.isArray(formats) ? formats.filter((f: string) => validFormats.includes(f)) : ['json', 'csv', 'pdf']
    const includeArr = Array.isArray(include) ? include.filter((i: string) => validInclude.includes(i)) : ['decisions', 'projects', 'comments', 'attachments']

    const id = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + EXPORT_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()

    db.prepare(
      `INSERT INTO data_exports (id, user_id, status, formats, include_data, expires_at)
       VALUES (?, ?, 'requested', ?, ?, ?)`
    ).run(id, userId, JSON.stringify(formatsArr), JSON.stringify(includeArr), expiresAt)

    auditLog(userId, 'export_requested', 'data_export', id, { formats: formatsArr, include: includeArr })

    // In production, enqueue background job here. For now we simulate completion.
    db.prepare(
      `UPDATE data_exports SET status = 'processing', started_at = ? WHERE id = ?`
    ).run(new Date().toISOString(), id)

    // Simulate completed export with a placeholder storage key (no actual S3)
    const storageKey = `exports/${userId}/${id}.zip`
    db.prepare(
      `UPDATE data_exports SET status = 'completed', completed_at = ?, storage_key = ?, size_bytes = 0 WHERE id = ?`
    ).run(new Date().toISOString(), storageKey, id)

    auditLog(userId, 'export_completed', 'data_export', id, { storage_key: storageKey })

    return res.status(201).json({ export_id: id, status: 'completed' })
  } catch (err) {
    console.error('[Privacy] Export create error:', err)
    return res.status(500).json({ message: 'An error occurred' })
  }
})

// GET /api/v1/privacy/exports - list exports for user
privacyRouter.get('/v1/privacy/exports', authMiddleware, (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId?: string }).userId
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    const rows = db.prepare(
      'SELECT id, status, formats, include_data, size_bytes, requested_at, completed_at, expires_at FROM data_exports WHERE user_id = ? ORDER BY requested_at DESC LIMIT 20'
    ).all(userId) as Array<{
      id: string
      status: string
      formats: string
      include_data: string
      size_bytes: number | null
      requested_at: string
      completed_at: string | null
      expires_at: string | null
    }>

    const exports = rows.map((r) => ({
      id: r.id,
      status: r.status,
      formats: parseJson<string[]>(r.formats) ?? [],
      include: parseJson<string[]>(r.include_data) ?? [],
      size_bytes: r.size_bytes,
      requested_at: r.requested_at,
      completed_at: r.completed_at,
      expires_at: r.expires_at,
      presigned_url: r.status === 'completed' && r.expires_at && new Date(r.expires_at) > new Date()
        ? `/api/v1/privacy/exports/${r.id}/download`
        : undefined,
    }))

    return res.json(exports)
  } catch (err) {
    console.error('[Privacy] Exports list error:', err)
    return res.status(500).json({ message: 'An error occurred' })
  }
})

// GET /api/v1/privacy/exports/:id - get single export status
privacyRouter.get('/v1/privacy/exports/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId?: string }).userId
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    const { id } = req.params
    const row = db.prepare('SELECT * FROM data_exports WHERE id = ? AND user_id = ?').get(id, userId) as {
      id: string
      status: string
      formats: string
      include_data: string
      storage_key: string | null
      size_bytes: number | null
      requested_at: string
      completed_at: string | null
      expires_at: string | null
      error_message: string | null
    } | undefined

    if (!row) return res.status(404).json({ message: 'Export not found' })

    const expiresAt = row.expires_at ? new Date(row.expires_at) : null
    const isExpired = expiresAt && expiresAt < new Date()

    return res.json({
      id: row.id,
      status: row.status,
      formats: parseJson<string[]>(row.formats) ?? [],
      include: parseJson<string[]>(row.include_data) ?? [],
      size_bytes: row.size_bytes,
      requested_at: row.requested_at,
      completed_at: row.completed_at,
      expires_at: row.expires_at,
      error_message: row.error_message,
      presigned_url:
        row.status === 'completed' && !isExpired
          ? `/api/v1/privacy/exports/${row.id}/download`
          : undefined,
    })
  } catch (err) {
    console.error('[Privacy] Export get error:', err)
    return res.status(500).json({ message: 'An error occurred' })
  }
})

// GET /api/v1/privacy/exports/:id/download - download export (stream placeholder; production: S3 presigned)
privacyRouter.get('/v1/privacy/exports/:id/download', authMiddleware, (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId?: string }).userId
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    const { id } = req.params
    const row = db.prepare('SELECT * FROM data_exports WHERE id = ? AND user_id = ?').get(id, userId) as {
      status: string
      storage_key: string | null
      expires_at: string | null
    } | undefined

    if (!row) return res.status(404).json({ message: 'Export not found' })
    if (row.status !== 'completed') return res.status(400).json({ message: 'Export not ready for download' })
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return res.status(410).json({ message: 'Download link has expired' })
    }

    // In production: stream from S3 or redirect to presigned URL. For now return a placeholder file.
    const placeholder = `Archject Data Export\nExport ID: ${id}\nRequested: ${new Date().toISOString()}\n\nIn production, this file would contain your full account data (JSON, CSV, PDF Decision Logs, attachments).`
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="archject-export-${id}.txt"`)
    return res.send(placeholder)
  } catch (err) {
    console.error('[Privacy] Export download error:', err)
    return res.status(500).json({ message: 'An error occurred' })
  }
})

// POST /api/v1/privacy/deletions - create deletion request
privacyRouter.post('/v1/privacy/deletions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId?: string }).userId
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    const { password, retention_window_days } = req.body ?? {}

    // Verify password
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as { password_hash: string } | undefined
    if (!user) return res.status(404).json({ message: 'User not found' })
    if (!password || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Password verification failed' })
    }

    const windowDays = typeof retention_window_days === 'number' ? retention_window_days : HOLD_WINDOW_DAYS
    const scheduledFor = new Date(Date.now() + windowDays * 24 * 60 * 60 * 1000).toISOString()

    const id = crypto.randomUUID()
    db.prepare(
      `INSERT INTO deletion_requests (id, user_id, status, verification_method, scheduled_for)
       VALUES (?, ?, 'scheduled', 'password', ?)`
    ).run(id, userId, scheduledFor)

    auditLog(userId, 'deletion_requested', 'deletion_request', id, { scheduled_for: scheduledFor })

    return res.status(201).json({ deletion_id: id, status: 'scheduled', scheduled_for: scheduledFor })
  } catch (err) {
    console.error('[Privacy] Deletion create error:', err)
    return res.status(500).json({ message: 'An error occurred' })
  }
})

// GET /api/v1/privacy/deletions/:id - get deletion request status
privacyRouter.get('/v1/privacy/deletions/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId?: string }).userId
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    const { id } = req.params
    const row = db.prepare('SELECT * FROM deletion_requests WHERE id = ? AND user_id = ?').get(id, userId) as {
      id: string
      status: string
      scheduled_for: string | null
      requested_at: string
      completed_at: string | null
    } | undefined

    if (!row) return res.status(404).json({ message: 'Deletion request not found' })

    return res.json({
      id: row.id,
      status: row.status,
      scheduled_for: row.scheduled_for,
      requested_at: row.requested_at,
      completed_at: row.completed_at,
    })
  } catch (err) {
    console.error('[Privacy] Deletion get error:', err)
    return res.status(500).json({ message: 'An error occurred' })
  }
})

// GET /api/v1/privacy/backups - admin only, backup summary
privacyRouter.get('/v1/privacy/backups', authMiddleware, (req: Request, res: Response) => {
  try {
    // In production, check admin role. For now allow any authenticated user to see summary.
    const rows = db.prepare(
      'SELECT id, job_timestamp, snapshot_key, retention_until, size_bytes, status FROM backups ORDER BY job_timestamp DESC LIMIT 10'
    ).all() as Array<{
      id: string
      job_timestamp: string
      snapshot_key: string | null
      retention_until: string | null
      size_bytes: number | null
      status: string
    }>

    return res.json({
      cadence: 'nightly',
      retention_days: 90,
      encryption: 'AES-256',
      snapshots: rows,
    })
  } catch (err) {
    console.error('[Privacy] Backups get error:', err)
    return res.status(500).json({ message: 'An error occurred' })
  }
})
