import { Router, Request, Response } from 'express'
import { db } from './db.js'
import { getPaymentAdapter } from './payment-adapter.js'

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

/** Payment provider webhook - invoice.paid, payment_failed, subscription.updated */
webhooksRouter.post('/payment-provider', (req: Request, res: Response) => {
  const signature = req.get('stripe-signature') ?? req.get('x-webhook-signature') ?? ''
  const adapter = getPaymentAdapter()
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
  if (!adapter.verifyWebhookSignature(rawBody, signature, process.env.WEBHOOK_SECRET ?? 'dev-secret')) {
    return res.status(401).json({ error: 'Invalid signature' })
  }
  const event = typeof req.body === 'object' ? req.body : { type: '', data: {} }
  const { type, data } = event
  try {
    if (type === 'invoice.payment_succeeded' || type === 'invoice.paid') {
      const invId = data?.object?.id ?? data?.invoiceId
      if (invId) {
        db.prepare(
          `UPDATE invoices SET status = 'paid', amount_paid_cents = amount_due_cents, updated_at = ? WHERE provider_invoice_id = ?`
        ).run(new Date().toISOString(), invId)
      }
    } else if (type === 'invoice.payment_failed' || type === 'payment_failed') {
      const subId = data?.object?.subscription ?? data?.subscriptionId
      if (subId) {
        db.prepare(
          `UPDATE subscriptions SET status = 'past_due', updated_at = ? WHERE provider_subscription_id = ?`
        ).run(new Date().toISOString(), subId)
      }
    }
  } catch (err) {
    console.error('[Webhook] Payment provider error:', err)
  }
  res.status(200).json({ received: true })
})
