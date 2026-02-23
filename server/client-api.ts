import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { db } from './db.js'

const HMAC_SECRET = process.env.HMAC_SECRET ?? 'archject-client-token-secret'
const JWT_SECRET = process.env.JWT_SECRET ?? process.env.CLIENT_TOKEN_SECRET ?? 'dev-secret'

function hashToken(token: string): string {
  return crypto.createHmac('sha256', HMAC_SECRET).update(token).digest('hex')
}

function getTokenPayload(token: string): { projectId: string; decisionIds: string[] } | null {
  const tokenHash = hashToken(token)
  const tokenRow = db.prepare(
    `SELECT project_id, decision_ids FROM client_tokens WHERE token_hash = ?`
  ).get(tokenHash) as { project_id: string; decision_ids: string } | undefined

  if (tokenRow) {
    let decisionIds: string[] = []
    try {
      decisionIds = JSON.parse(tokenRow.decision_ids)
    } catch {
      // ignore
    }
    return { projectId: tokenRow.project_id, decisionIds }
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { projectId?: string; decisionIds?: string[] }
    return {
      projectId: decoded.projectId ?? '',
      decisionIds: decoded.decisionIds ?? [],
    }
  } catch {
    return null
  }
}

export const clientRouter = Router()

// GET /client/:token - returns decision for client portal (must be before /client/confirmation param handling)
clientRouter.get('/client/:token', (req: Request, res: Response) => {
  const token = req.params.token
  const payload = getTokenPayload(token)
  if (!payload) {
    return res.status(404).json({
      code: 'INVALID_TOKEN',
      message: 'Invalid or expired token',
    })
  }

  const { decisionIds } = payload
  const decisionId = decisionIds[0]
  if (!decisionId) {
    return res.status(404).json({
      code: 'NOT_FOUND',
      message: 'No decision found for this token',
    })
  }

  const row = db.prepare(
    `SELECT d.id, d.project_id, d.title, d.status, d.created_at, d.updated_at
     FROM decisions d WHERE d.id = ? AND d.project_id = ?`
  ).get(decisionId, payload.projectId) as {
    id: string
    project_id: string
    title: string
    status: string
    created_at: string
    updated_at: string
  } | undefined

  if (!row) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' })
  }

  let opts: { id: string; label: string; description?: string; selected?: boolean }[]
  try {
    const options = db.prepare(
      `SELECT id, label, description FROM decision_options WHERE decision_id = ?`
    ).all(decisionId) as { id: string; label: string; description: string | null }[]
    opts = options.length > 0
      ? options.map((o) => ({
          id: o.id,
          label: o.label,
          description: o.description ?? undefined,
          selected: false,
        }))
      : [
          { id: 'opt1', label: 'Option A', description: 'First option', selected: false },
          { id: 'opt2', label: 'Option B', description: 'Second option', selected: false },
        ]
  } catch {
    opts = [
      { id: 'opt1', label: 'Option A', description: 'First option', selected: false },
      { id: 'opt2', label: 'Option B', description: 'Second option', selected: false },
    ]
  }

  return res.json({
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: '',
    options: opts,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
})

clientRouter.get('/client/confirmation', (req: Request, res: Response) => {
  const token = req.query.token as string
  if (!token) {
    return res.status(400).json({
      code: 'MISSING_TOKEN',
      message: 'Token is required',
    })
  }

  const payload = getTokenPayload(token)
  if (!payload) {
    return res.status(404).json({
      code: 'INVALID_TOKEN',
      message: 'Invalid or expired token',
    })
  }

  const { decisionIds } = payload
  const decisionId = decisionIds[0]
  if (!decisionId) {
    return res.status(404).json({
      code: 'NOT_FOUND',
      message: 'No decision found for this token',
    })
  }

  const decision = db.prepare(
    `SELECT d.id, d.title, d.last_confirmed_at, d.last_confirmed_by,
            p.name as project_name
     FROM decisions d
     JOIN projects p ON p.id = d.project_id
     WHERE d.id = ? AND d.project_id = ?`
  ).get(decisionId, payload.projectId) as {
    id: string
    title: string
    last_confirmed_at: string | null
    last_confirmed_by: string | null
    project_name: string
  } | undefined

  if (!decision) {
    return res.status(404).json({
      code: 'NOT_FOUND',
      message: 'Decision not found',
    })
  }

  let lastConfirmedBy: { userId?: string; clientName?: string } | null = null
  try {
    lastConfirmedBy = decision.last_confirmed_by
      ? JSON.parse(decision.last_confirmed_by)
      : null
  } catch {
    // ignore
  }

  res.json({
    decisionId: decision.id,
    projectId: payload.projectId,
    projectTitle: decision.project_name,
    decisionTitle: decision.title,
    approvedByName: lastConfirmedBy?.clientName ?? lastConfirmedBy?.userId ?? null,
    timestamp: decision.last_confirmed_at ?? new Date().toISOString(),
    options: [],
  })
})

clientRouter.get('/client/receipt', (req: Request, res: Response) => {
  const token = req.query.token as string
  const decisionId = req.query.decisionId as string

  if (!token || !decisionId) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Token and decisionId are required',
    })
  }

  const payload = getTokenPayload(token)
  if (!payload) {
    return res.status(404).json({
      code: 'INVALID_TOKEN',
      message: 'Invalid or expired token',
    })
  }

  if (!payload.decisionIds.includes(decisionId)) {
    return res.status(403).json({
      code: 'FORBIDDEN',
      message: 'Access denied to this decision',
    })
  }

  const baseUrl = (req.get('x-forwarded-proto') || req.protocol) + '://' + (req.get('x-forwarded-host') || req.get('host') || 'localhost:3001')
  res.json({
    url: `${baseUrl}/api/v1/client/receipt/download?token=${encodeURIComponent(token)}&decisionId=${decisionId}`,
  })
})

clientRouter.get('/client/receipt/download', (req: Request, res: Response) => {
  const token = req.query.token as string
  const decisionId = req.query.decisionId as string

  if (!token || !decisionId) {
    return res.status(400).send('Invalid request')
  }

  const payload = getTokenPayload(token)
  if (!payload) {
    return res.status(404).send('Invalid or expired token')
  }

  if (!payload.decisionIds.includes(decisionId)) {
    return res.status(403).send('Access denied')
  }

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="approval-receipt-${decisionId.slice(0, 8)}.pdf"`)
  res.send(Buffer.from('%PDF-1.4 placeholder - approval receipt PDF'))
})
