import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { db } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
const CLIENT_TOKEN_SECRET = process.env.CLIENT_TOKEN_SECRET ?? JWT_SECRET

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

function validateClientToken(token: string): { projectId: string; decisionIds: string[] } | null {
  try {
    const decoded = jwt.verify(token, CLIENT_TOKEN_SECRET) as {
      projectId?: string
      decisionIds?: string[]
      exp?: number
    }
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null
    return {
      projectId: decoded.projectId ?? '',
      decisionIds: decoded.decisionIds ?? [],
    }
  } catch {
    return null
  }
}

export const actionsRouter = Router()

actionsRouter.post('/actions/:actionId/confirm', (req: Request, res: Response) => {
  const { actionId } = req.params
  const { source = 'internal', token, exportOptions } = req.body as {
    source?: 'internal' | 'client_token'
    token?: string
    exportOptions?: {
      types?: ('csv' | 'pdf' | 'signed_pdf')[]
      includeAssets?: boolean
      branding?: string
    }
  }

  const decision = db.prepare(
    'SELECT id, project_id FROM decisions WHERE id = ?'
  ).get(actionId) as { id: string; project_id: string } | undefined

  if (!decision) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' })
  }

  let userId: string | null = null
  let confirmedContext: 'internal' | 'client_token' = 'internal'
  let lastConfirmedBy: string

  if (source === 'client_token') {
    if (!token) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Token required for client_token source' })
    }
    const validated = validateClientToken(token)
    if (!validated) {
      return res.status(401).json({ code: 'INVALID_TOKEN', message: 'Invalid or expired token' })
    }
    if (decision.project_id !== validated.projectId) {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Token not valid for this decision' })
    }
    if (validated.decisionIds.length > 0 && !validated.decisionIds.includes(actionId)) {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Token not allowed for this decision' })
    }
    confirmedContext = 'client_token'
    lastConfirmedBy = JSON.stringify({ clientTokenId: token.slice(0, 12) + '...', clientName: null })
  } else {
    userId = optionalAuth(req)
    if (!userId) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' })
    }
    lastConfirmedBy = JSON.stringify({ userId, clientName: null })
  }

  const referenceId = `conf-${crypto.randomUUID().slice(0, 8)}`
  const now = new Date().toISOString()

  db.prepare(
    `UPDATE decisions SET
      status = 'approved',
      last_confirmed_at = ?,
      last_confirmed_by = ?,
      confirmation_reference_id = ?,
      confirmed_context = ?,
      decision_made_at = ?,
      reviewer_id = ?
    WHERE id = ?`
  ).run(now, lastConfirmedBy, referenceId, confirmedContext, now, userId ?? null, actionId)

  const auditId = crypto.randomUUID()
  db.prepare(
    `INSERT INTO audit_log (id, project_id, actor_type, actor_id, client_token_id, action_type, reference_id, payload, immutable)
     VALUES (?, ?, ?, ?, ?, 'decision_approved', ?, ?, 1)`
  ).run(
    auditId,
    decision.project_id,
    confirmedContext === 'client_token' ? 'client_token' : 'user',
    userId ?? null,
    confirmedContext === 'client_token' ? token?.slice(0, 20) : null,
    referenceId,
    JSON.stringify({ decisionId: actionId })
  )

  let exportJobId: string | undefined
  if (exportOptions?.types?.length) {
    const jobId = crypto.randomUUID()
    db.prepare(
      `INSERT INTO jobs (id, project_id, user_id, type, payload, status, cancellable, created_at, updated_at)
       VALUES (?, ?, ?, 'EXPORT_PDF', ?, 'QUEUED', 1, ?, ?)`
    ).run(
      jobId,
      decision.project_id,
      userId ?? null,
      JSON.stringify({
        decisionIds: [actionId],
        types: exportOptions.types,
        includeAssets: exportOptions.includeAssets,
        branding: exportOptions.branding,
      }),
      now,
      now
    )
    exportJobId = jobId
  }

  res.status(200).json({
    referenceId,
    timestamp: now,
    projectId: decision.project_id,
    exportJobId,
  })
})
