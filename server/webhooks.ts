import { Router, Request, Response } from 'express'
import { db } from './db.js'

/** SendGrid event webhook - handles delivered, open, click, bounce, blocked */
export const webhooksRouter = Router()

interface SendGridEvent {
  email: string
  event: 'delivered' | 'open' | 'click' | 'bounce' | 'dropped' | 'blocked' | 'spamreport'
  sg_message_id?: string
  timestamp?: number
}

webhooksRouter.post('/sendgrid', (req: Request, res: Response) => {
  res.status(200).send()

  const events = req.body as SendGridEvent | SendGridEvent[]
  const list = Array.isArray(events) ? events : [events]

  for (const ev of list) {
    if (ev.event === 'bounce' || ev.event === 'blocked' || ev.event === 'dropped') {
      try {
        db.prepare(
          `UPDATE users SET verification_attempts_count = verification_attempts_count + 1 
           WHERE email = ? AND email_verified = 0`
        ).run(ev.email)
      } catch (err) {
        console.error('[Webhook] Error updating bounce status:', err)
      }
    }
  }
})
