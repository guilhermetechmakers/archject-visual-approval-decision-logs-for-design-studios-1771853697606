import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { db } from './db.js'

const supportTicketRouter = Router()

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
 * POST /api/support/ticket
 * Request: { incidentId, userId?, email?, message, attachments? }
 * Response: { ticketId, status }
 */
supportTicketRouter.post('/support/ticket', (req: Request, res: Response) => {
  try {
    const { incidentId, userId: bodyUserId, email, message, attachments } = req.body

    const incidentIdVal = sanitize(incidentId, 128)
    const msgVal = sanitize(message, 5000)
    if (!incidentIdVal || !msgVal) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'incidentId and message are required',
      })
    }

    const authUserId = getUserIdFromAuth(req)
    const userId = authUserId ?? sanitize(bodyUserId, 128)
    const emailVal = sanitize(email, 255)

    const ticketId = crypto.randomUUID()
    const now = new Date().toISOString()

    db.prepare(
      `INSERT INTO support_tickets (ticket_id, incident_id, user_id, email, message, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'open', ?, ?)`
    ).run(ticketId, incidentIdVal, userId, emailVal, msgVal, now, now)

    res.status(201).json({
      ticketId,
      status: 'open',
    })
  } catch (e) {
    console.error('[Support] POST /support/ticket:', e)
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to create support ticket',
    })
  }
})

export { supportTicketRouter }
