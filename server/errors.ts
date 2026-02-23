import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { db } from './db.js'

const errorsRouter = Router()

function sanitize(str: unknown, maxLen: number): string | null {
  if (str == null) return null
  const s = String(str).trim()
  return s.length > 0 ? s.slice(0, maxLen) : null
}

function getUserIdFromAuth(req: Request): string | null {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return null
  try {
    const token = auth.slice(7)
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'))
    return payload.sub ?? null
  } catch {
    return null
  }
}

/**
 * POST /api/errors/report
 * Request: { timestamp, userId?, route, method?, url?, requestId?, errorMessage, stackTraceSummary?, clientContext?, tags?, dedupToken? }
 * Response: { incidentId, receivedAt }
 */
errorsRouter.post('/errors/report', (req: Request, res: Response) => {
  try {
    const {
      timestamp,
      userId: bodyUserId,
      route,
      method,
      url,
      requestId,
      errorMessage,
      stackTraceSummary,
      clientContext,
      tags,
      dedupToken,
    } = req.body

    const routeVal = sanitize(route, 2048)
    const msgVal = sanitize(errorMessage, 4096)
    if (!routeVal || !msgVal) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'route and errorMessage are required',
      })
    }

    const authUserId = getUserIdFromAuth(req)
    const userId = authUserId ?? sanitize(bodyUserId, 128)
    const methodVal = sanitize(method, 32)
    const urlVal = sanitize(url, 2048)
    const stackVal = sanitize(stackTraceSummary, 3000)
    const ctxStr =
      clientContext != null && typeof clientContext === 'object'
        ? JSON.stringify(clientContext).slice(0, 4096)
        : null
    const tagsStr = Array.isArray(tags) ? JSON.stringify(tags).slice(0, 512) : null
    const correlationId = sanitize(requestId, 128)
    const receivedAt = timestamp ?? new Date().toISOString()

    const incidentId = crypto.randomUUID()

    db.prepare(
      `INSERT INTO server_errors (
        id, correlation_id, created_at, user_id, route, method, url,
        error_message, stack_summary, client_context, tags, resolved, resolved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)`
    ).run(
      incidentId,
      correlationId,
      receivedAt,
      userId,
      routeVal,
      methodVal,
      urlVal,
      msgVal,
      stackVal,
      ctxStr,
      tagsStr
    )

    res.status(200).json({
      incidentId,
      receivedAt,
    })
  } catch (e) {
    console.error('[Errors] POST /errors/report:', e)
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to report error',
      incidentId: crypto.randomUUID(),
    })
  }
})

export { errorsRouter }
