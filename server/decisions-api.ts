import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { db } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'

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

export const decisionsApiRouter = Router()

// GET /decisions/:decisionId/confirmation (mounted at /api/v1)
decisionsApiRouter.get('/decisions/:decisionId/confirmation', (req: Request, res: Response) => {
  const { decisionId } = req.params
  const userId = optionalAuth(req)

  const row = db.prepare(
    `SELECT id, project_id, status, last_confirmed_at, last_confirmed_by, confirmation_reference_id, confirmed_context
     FROM decisions WHERE id = ?`
  ).get(decisionId) as Record<string, unknown> | undefined

  if (!row) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Decision not found' })
  }

  // For internal users, allow access. For unauthenticated, we could allow with token - simplified: require auth for now
  if (!userId) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' })
  }

  let lastConfirmedBy: { userId?: string | null; clientName?: string | null } = {}
  if (row.last_confirmed_by) {
    try {
      lastConfirmedBy = JSON.parse(row.last_confirmed_by as string)
    } catch {
      // ignore
    }
  }

  return res.json({
    decisionId: row.id,
    status: row.status,
    lastConfirmedAt: row.last_confirmed_at ?? null,
    lastConfirmedBy,
    referenceId: row.confirmation_reference_id ?? null,
  })
})
