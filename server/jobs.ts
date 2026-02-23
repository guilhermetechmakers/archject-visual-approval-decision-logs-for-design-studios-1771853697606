import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { db } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'

const JOB_TYPES = ['EXPORT_PDF', 'EXPORT_CSV', 'SIGNING', 'UPLOAD', 'GENERIC'] as const
const JOB_STATUSES = ['QUEUED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'] as const

function optionalAuth(req: Request): string | null {
  const auth = req.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET) as { sub: string }
    return decoded.sub
  } catch {
    return null
  }
}

function requireAuth(req: Request, res: Response, next: () => void) {
  const userId = optionalAuth(req)
  if (!userId) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' })
  }
  ;(req as Request & { userId: string }).userId = userId
  next()
}

function logJobHistory(jobId: string, actor: 'SYSTEM' | 'USER', action: string, detail?: Record<string, unknown>) {
  const id = crypto.randomUUID()
  db.prepare(
    'INSERT INTO job_history (id, job_id, actor, action, detail) VALUES (?, ?, ?, ?, ?)'
  ).run(id, jobId, actor, action, detail ? JSON.stringify(detail) : null)
}

function runJobWorker(jobId: string) {
  const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as {
    id: string
    type: string
    payload: string
    project_id: string | null
  } | undefined
  if (!row || row.type !== 'EXPORT_PDF' && row.type !== 'EXPORT_CSV' && row.type !== 'GENERIC') return

  const steps = [
    { name: 'Queued', status: 'completed' },
    { name: 'Preparing', status: 'in_progress' },
    { name: 'Generating', status: 'pending' },
    { name: 'Signing', status: 'pending' },
    { name: 'Packaging', status: 'pending' },
    { name: 'Ready', status: 'pending' },
  ]

  const updateProgress = (percent: number, currentStep: string, stepIndex: number) => {
    const stepsCopy = steps.map((s, i) => ({
      ...s,
      status: i < stepIndex ? 'completed' : i === stepIndex ? 'in_progress' : 'pending',
    }))
    db.prepare(
      'UPDATE jobs SET status = ?, progress_percent = ?, current_step = ?, steps = ?, updated_at = ? WHERE id = ?'
    ).run('IN_PROGRESS', percent, currentStep, JSON.stringify(stepsCopy), new Date().toISOString(), jobId)
  }

  const failJob = (err: { code?: string; message: string }) => {
    db.prepare(
      'UPDATE jobs SET status = ?, error = ?, updated_at = ?, completed_at = ? WHERE id = ?'
    ).run('FAILED', JSON.stringify(err), new Date().toISOString(), new Date().toISOString(), jobId)
    logJobHistory(jobId, 'SYSTEM', 'failed', err)
  }

  const completeJob = (resultUrls: { name: string; url: string; expires_at?: string }[]) => {
    const stepsComplete = steps.map((s) => ({ ...s, status: 'completed' as const }))
    db.prepare(
      'UPDATE jobs SET status = ?, progress_percent = 100, current_step = ?, steps = ?, result_urls = ?, updated_at = ?, completed_at = ? WHERE id = ?'
    ).run(
      'COMPLETED',
      'Ready',
      JSON.stringify(stepsComplete),
      JSON.stringify(resultUrls),
      new Date().toISOString(),
      new Date().toISOString(),
      jobId
    )
    logJobHistory(jobId, 'SYSTEM', 'completed', { resultCount: resultUrls.length })
  }

  setTimeout(() => {
    const current = db.prepare('SELECT status FROM jobs WHERE id = ?').get(jobId) as { status: string } | undefined
    if (current?.status === 'CANCELLED') return

    updateProgress(10, 'Preparing', 1)
  }, 500)

  setTimeout(() => {
    const current = db.prepare('SELECT status FROM jobs WHERE id = ?').get(jobId) as { status: string } | undefined
    if (current?.status === 'CANCELLED') return

    updateProgress(30, 'Generating', 2)
  }, 1500)

  setTimeout(() => {
    const current = db.prepare('SELECT status FROM jobs WHERE id = ?').get(jobId) as { status: string } | undefined
    if (current?.status === 'CANCELLED') return

    updateProgress(60, 'Signing', 3)
  }, 2500)

  setTimeout(() => {
    const current = db.prepare('SELECT status FROM jobs WHERE id = ?').get(jobId) as { status: string } | undefined
    if (current?.status === 'CANCELLED') return

    updateProgress(85, 'Packaging', 4)
  }, 3500)

  setTimeout(() => {
    const current = db.prepare('SELECT status FROM jobs WHERE id = ?').get(jobId) as { status: string } | undefined
    if (current?.status === 'CANCELLED') return

    const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:3001'
    const resultUrls = [
      {
        name: `export-${jobId.slice(0, 8)}.pdf`,
        url: `${baseUrl}/api/jobs/${jobId}/download`,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    ]
    completeJob(resultUrls)
  }, 4500)
}

export const jobsRouter = Router()

jobsRouter.post('/jobs', requireAuth, (req: Request, res: Response) => {
  const userId = (req as Request & { userId: string }).userId
  const { type, projectId, payload, cancellable = true } = req.body

  if (!type || !JOB_TYPES.includes(type)) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'type must be one of: EXPORT_PDF, EXPORT_CSV, SIGNING, UPLOAD, GENERIC',
    })
  }

  const jobId = crypto.randomUUID()
  const now = new Date().toISOString()

  db.prepare(
    `INSERT INTO jobs (id, project_id, user_id, type, payload, status, cancellable, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'QUEUED', ?, ?, ?)`
  ).run(
    jobId,
    projectId ?? null,
    userId,
    type,
    JSON.stringify(payload ?? {}),
    cancellable ? 1 : 0,
    now,
    now
  )

  logJobHistory(jobId, 'USER', 'created', { type, projectId })

  runJobWorker(jobId)

  res.status(201).json({ jobId, status: 'QUEUED' })
})

jobsRouter.get('/jobs/:jobId', requireAuth, (req: Request, res: Response) => {
  const userId = (req as Request & { userId: string }).userId
  const { jobId } = req.params

  const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as Record<string, unknown> | undefined
  if (!row) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Job not found' })
  }

  if (row.user_id !== userId) {
    return res.status(403).json({ code: 'FORBIDDEN', message: 'Access denied' })
  }

  const baseUrl = (req.get('x-forwarded-proto') || req.protocol) + '://' + (req.get('x-forwarded-host') || req.get('host') || 'localhost:3001')
  let resultUrls = (row.result_urls as string) ?? '[]'
  try {
    const urls = JSON.parse(resultUrls) as { name: string; url?: string }[]
    resultUrls = JSON.stringify(
      urls.map((u) => ({
        ...u,
        url: u.url?.startsWith('/') ? `${baseUrl}${u.url}` : u.url,
      }))
    )
  } catch {
    // keep as-is
  }

  const job = {
    id: row.id,
    project_id: row.project_id,
    user_id: row.user_id,
    type: row.type,
    payload: typeof row.payload === 'string' ? JSON.parse(row.payload as string) : row.payload,
    status: row.status,
    cancellable: !!row.cancellable,
    progress_percent: row.progress_percent,
    current_step: row.current_step,
    steps: typeof row.steps === 'string' ? JSON.parse(row.steps as string) : (row.steps ?? []),
    result_urls: typeof resultUrls === 'string' ? JSON.parse(resultUrls) : resultUrls,
    error: typeof row.error === 'string' ? JSON.parse(row.error as string) : row.error,
    created_at: row.created_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at,
    cancelled_at: row.cancelled_at,
  }

  res.json({ job })
})

jobsRouter.post('/jobs/:jobId/cancel', requireAuth, (req: Request, res: Response) => {
  const userId = (req as Request & { userId: string }).userId
  const { jobId } = req.params

  const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as { user_id: string; status: string; cancellable: number } | undefined
  if (!row) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Job not found' })
  }

  if (row.user_id !== userId) {
    return res.status(403).json({ code: 'FORBIDDEN', message: 'Access denied' })
  }

  if (!row.cancellable) {
    return res.status(409).json({
      code: 'CANNOT_CANCEL',
      message: 'This job cannot be cancelled',
    })
  }

  if (row.status !== 'QUEUED' && row.status !== 'IN_PROGRESS') {
    return res.status(409).json({
      code: 'CANNOT_CANCEL',
      message: `Job is already ${row.status}`,
    })
  }

  const now = new Date().toISOString()
  db.prepare(
    'UPDATE jobs SET status = ?, cancelled_at = ?, updated_at = ? WHERE id = ?'
  ).run('CANCELLED', now, now, jobId)

  logJobHistory(jobId, 'USER', 'cancelled', {})

  const updated = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as Record<string, unknown>
  const job = {
    id: updated.id,
    project_id: updated.project_id,
    user_id: updated.user_id,
    type: updated.type,
    payload: typeof updated.payload === 'string' ? JSON.parse(updated.payload as string) : updated.payload,
    status: updated.status,
    cancellable: !!updated.cancellable,
    progress_percent: updated.progress_percent,
    current_step: updated.current_step,
    steps: typeof updated.steps === 'string' ? JSON.parse(updated.steps as string) : (updated.steps ?? []),
    result_urls: typeof updated.result_urls === 'string' ? JSON.parse(updated.result_urls as string) : (updated.result_urls ?? []),
    error: updated.error,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
    completed_at: updated.completed_at,
    cancelled_at: updated.cancelled_at,
  }

  res.status(202).json({ job })
})

jobsRouter.get('/jobs', requireAuth, (req: Request, res: Response) => {
  const userId = (req as Request & { userId: string }).userId
  const projectId = req.query.projectId as string | undefined
  const type = req.query.type as string | undefined
  const status = req.query.status as string | undefined
  const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '20', 10)))

  let where = 'user_id = ?'
  const params: unknown[] = [userId]
  if (projectId) {
    where += ' AND project_id = ?'
    params.push(projectId)
  }
  if (type) {
    where += ' AND type = ?'
    params.push(type)
  }
  if (status) {
    where += ' AND status = ?'
    params.push(status)
  }

  const rows = db.prepare(
    `SELECT * FROM jobs WHERE ${where} ORDER BY created_at DESC LIMIT ?`
  ).all(...params, limit) as Record<string, unknown>[]

  const jobs = rows.map((r) => ({
    id: r.id,
    project_id: r.project_id,
    user_id: r.user_id,
    type: r.type,
    payload: typeof r.payload === 'string' ? JSON.parse(r.payload as string) : r.payload,
    status: r.status,
    cancellable: !!r.cancellable,
    progress_percent: r.progress_percent,
    current_step: r.current_step,
    steps: typeof r.steps === 'string' ? JSON.parse(r.steps as string) : (r.steps ?? []),
    result_urls: typeof r.result_urls === 'string' ? JSON.parse(r.result_urls as string) : (r.result_urls ?? []),
    error: typeof r.error === 'string' ? JSON.parse(r.error as string) : r.error,
    created_at: r.created_at,
    updated_at: r.updated_at,
    completed_at: r.completed_at,
    cancelled_at: r.cancelled_at,
  }))

  res.json({ jobs })
})

jobsRouter.get('/jobs/:jobId/download', requireAuth, (req: Request, res: Response) => {
  const userId = (req as Request & { userId: string }).userId
  const { jobId } = req.params

  const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as {
    user_id: string
    status: string
    type: string
    project_id: string | null
  } | undefined
  if (!row) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Job not found' })
  }

  if (row.user_id !== userId) {
    return res.status(403).json({ code: 'FORBIDDEN', message: 'Access denied' })
  }

  if (row.status !== 'COMPLETED') {
    return res.status(400).json({ code: 'NOT_READY', message: 'Export not yet completed' })
  }

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename=export-${jobId.slice(0, 8)}.pdf`)
  res.send(Buffer.from('%PDF-1.4 placeholder - actual export would be generated by worker'))
})
