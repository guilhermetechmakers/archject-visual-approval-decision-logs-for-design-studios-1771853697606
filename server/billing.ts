import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { db } from './db.js'
import { getPaymentAdapter } from './payment-adapter.js'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'

const PLAN_NAMES: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  studio: 'Studio',
}

const PLAN_PRICES: Record<string, { monthly: number; annual: number }> = {
  free: { monthly: 0, annual: 0 },
  pro: { monthly: 2900, annual: 29000 },
  studio: { monthly: 7900, annual: 79000 },
}

function ensureStudio(studioId: string) {
  const studio = db.prepare('SELECT id FROM studios WHERE id = ?').get(studioId)
  if (!studio) {
    db.prepare(
      'INSERT INTO studios (id, name, default_currency) VALUES (?, ?, ?)'
    ).run(studioId, 'Default Studio', 'USD')
    db.prepare(
      `INSERT INTO subscriptions (id, studio_id, plan_id, seats, seats_used, status, price_per_seat_cents, billing_cycle)
       VALUES (?, ?, 'free', 2, 1, 'active', 0, 'monthly')`
    ).run(`sub_${studioId}`, studioId)
  }
}

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

function parseJson<T>(str: string | null): T | null {
  if (!str) return null
  try {
    return JSON.parse(str) as T
  } catch {
    return null
  }
}

export const billingRouter = Router()

billingRouter.use(authMiddleware)

billingRouter.get('/studios/:studioId/billing', (req: Request, res: Response) => {
  const { studioId } = req.params
  ensureStudio(studioId)

  const sub = db.prepare(
    'SELECT * FROM subscriptions WHERE studio_id = ? ORDER BY updated_at DESC LIMIT 1'
  ).get(studioId) as {
    id: string
    plan_id: string
    seats: number
    seats_used: number
    status: string
    price_per_seat_cents: number
    billing_cycle: string
    next_billing_date: string | null
    trial_ends_at: string | null
  } | undefined

  const defaultPm = db.prepare(
    'SELECT * FROM payment_methods WHERE studio_id = ? AND is_default = 1 LIMIT 1'
  ).get(studioId) as {
    id: string
    brand: string
    last4: string
    exp_month: number
    exp_year: number
    is_default: number
    created_at: string
  } | undefined

  const creditBalance = 0

  res.json({
    subscription: sub
      ? {
          id: sub.id,
          studioId,
          planId: sub.plan_id,
          planName: PLAN_NAMES[sub.plan_id] ?? sub.plan_id,
          seats: sub.seats,
          seatsUsed: sub.seats_used,
          status: sub.status,
          pricePerSeatCents: sub.price_per_seat_cents,
          billingCycle: sub.billing_cycle,
          nextBillingDate: sub.next_billing_date,
          trialEndsAt: sub.trial_ends_at,
          createdAt: '',
          updatedAt: '',
        }
      : null,
    creditBalanceCents: creditBalance,
    defaultPaymentMethod: defaultPm
      ? {
          id: defaultPm.id,
          studioId,
          brand: defaultPm.brand,
          last4: defaultPm.last4,
          expMonth: defaultPm.exp_month,
          expYear: defaultPm.exp_year,
          isDefault: Boolean(defaultPm.is_default),
          createdAt: defaultPm.created_at,
        }
      : null,
    canManageBilling: true,
  })
})

billingRouter.get('/studios/:studioId/subscription', (req: Request, res: Response) => {
  const { studioId } = req.params
  ensureStudio(studioId)

  const sub = db.prepare(
    'SELECT * FROM subscriptions WHERE studio_id = ? ORDER BY updated_at DESC LIMIT 1'
  ).get(studioId) as Record<string, unknown> | undefined

  if (!sub) {
    return res.json(null)
  }

  res.json({
    id: sub.id,
    studioId,
    planId: sub.plan_id,
    planName: PLAN_NAMES[sub.plan_id as string] ?? sub.plan_id,
    seats: sub.seats,
    seatsUsed: sub.seats_used,
    status: sub.status,
    pricePerSeatCents: sub.price_per_seat_cents,
    billingCycle: sub.billing_cycle,
    nextBillingDate: sub.next_billing_date,
    trialEndsAt: sub.trial_ends_at,
    createdAt: sub.created_at,
    updatedAt: sub.updated_at,
  })
})

billingRouter.post('/studios/:studioId/subscription', (req: Request, res: Response) => {
  const { studioId } = req.params
  const { planId, seats, paymentMethodId, promoCode } = req.body
  ensureStudio(studioId)

  const planSlug = planId ?? 'free'
  const prices = PLAN_PRICES[planSlug] ?? PLAN_PRICES.free
  const seatCount = Math.min(Math.max(1, Number(seats) || 2), planSlug === 'free' ? 2 : planSlug === 'pro' ? 20 : 100)
  const pricePerSeat = Math.round(prices.monthly / (planSlug === 'free' ? 2 : 5))

  const nextBilling = new Date()
  nextBilling.setMonth(nextBilling.getMonth() + 1)

  const id = `sub_${studioId}_${Date.now()}`
  db.prepare(
    `INSERT INTO subscriptions (id, studio_id, provider_subscription_id, plan_id, seats, seats_used, status, price_per_seat_cents, billing_cycle, next_billing_date)
     VALUES (?, ?, ?, ?, ?, ?, 'active', ?, 'monthly', ?)`
  ).run(id, studioId, id, planSlug, seatCount, Math.min(1, seatCount), pricePerSeat, nextBilling.toISOString())

  const row = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id) as Record<string, unknown>
  res.status(201).json({
    id: row.id,
    studioId,
    planId: row.plan_id,
    planName: PLAN_NAMES[row.plan_id as string] ?? row.plan_id,
    seats: row.seats,
    seatsUsed: row.seats_used,
    status: row.status,
    pricePerSeatCents: row.price_per_seat_cents,
    billingCycle: row.billing_cycle,
    nextBillingDate: row.next_billing_date,
    trialEndsAt: row.trial_ends_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
})

billingRouter.patch('/studios/:studioId/subscription', (req: Request, res: Response) => {
  const { studioId } = req.params
  const { planId, seats } = req.body
  ensureStudio(studioId)

  const sub = db.prepare(
    'SELECT * FROM subscriptions WHERE studio_id = ? ORDER BY updated_at DESC LIMIT 1'
  ).get(studioId) as Record<string, unknown> | undefined

  if (!sub) {
    return res.status(404).json({ message: 'No subscription found' })
  }

  if (planId) {
    db.prepare('UPDATE subscriptions SET plan_id = ?, updated_at = ? WHERE id = ?').run(
      planId,
      new Date().toISOString(),
      sub.id
    )
  }
  if (seats != null) {
    db.prepare('UPDATE subscriptions SET seats = ?, updated_at = ? WHERE id = ?').run(
      seats,
      new Date().toISOString(),
      sub.id
    )
  }

  const updated = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(sub.id) as Record<string, unknown>
  res.json({
    id: updated.id,
    studioId,
    planId: updated.plan_id,
    planName: PLAN_NAMES[updated.plan_id as string] ?? updated.plan_id,
    seats: updated.seats,
    seatsUsed: updated.seats_used,
    status: updated.status,
    pricePerSeatCents: updated.price_per_seat_cents,
    billingCycle: updated.billing_cycle,
    nextBillingDate: updated.next_billing_date,
    trialEndsAt: updated.trial_ends_at,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  })
})

billingRouter.post('/studios/:studioId/subscription/cancel', (req: Request, res: Response) => {
  const { studioId } = req.params
  const sub = db.prepare(
    'SELECT id FROM subscriptions WHERE studio_id = ? ORDER BY updated_at DESC LIMIT 1'
  ).get(studioId) as { id: string } | undefined

  if (sub) {
    db.prepare('UPDATE subscriptions SET status = ?, updated_at = ? WHERE id = ?').run(
      'canceled',
      new Date().toISOString(),
      sub.id
    )
  }
  res.json({ message: 'Subscription canceled' })
})

billingRouter.get('/studios/:studioId/invoices', (req: Request, res: Response) => {
  const { studioId } = req.params
  const { page = '1', perPage = '20', year, status } = req.query
  ensureStudio(studioId)

  let sql = 'SELECT * FROM invoices WHERE studio_id = ?'
  const params: (string | number)[] = [studioId]
  if (year) {
    sql += ' AND strftime("%Y", issued_at) = ?'
    params.push(String(year))
  }
  if (status) {
    sql += ' AND status = ?'
    params.push(String(status))
  }
  sql += ' ORDER BY issued_at DESC'

  let all = db.prepare(sql).all(...params) as Record<string, unknown>[]
  if (all.length === 0 && studioId === 'default') {
    const invId = 'inv_default_1'
    const issued = new Date().toISOString()
    try {
      db.prepare(
        `INSERT INTO invoices (id, studio_id, invoice_number, amount_due_cents, amount_paid_cents, currency, status, issued_at, line_items)
         VALUES (?, ?, 'INV-2025-001', 2900, 2900, 'USD', 'paid', ?, ?)`
      ).run(invId, studioId, issued, JSON.stringify([{ description: 'Pro Plan - 5 seats', quantity: 1, unitAmountCents: 2900 }]))
      all = db.prepare(sql).all(...params) as Record<string, unknown>[]
    } catch {
      // ignore if insert fails
    }
  }
  const total = all.length
  const pageNum = Math.max(1, Number(page))
  const perPageNum = Math.min(50, Math.max(1, Number(perPage)))
  const offset = (pageNum - 1) * perPageNum
  const invoices = all.slice(offset, offset + perPageNum)

  const result = invoices.map((inv) => ({
    id: inv.id,
    studioId: inv.studio_id,
    invoiceNumber: inv.invoice_number,
    amountDueCents: inv.amount_due_cents,
    amountPaidCents: inv.amount_paid_cents,
    currency: inv.currency,
    status: inv.status,
    issuedAt: inv.issued_at,
    dueAt: inv.due_at,
    lineItems: parseJson<Array<{ description: string; quantity: number; unitAmountCents: number }>>(
      inv.line_items as string
    ) ?? [],
  }))

  res.json({ invoices: result, total })
})

billingRouter.get('/studios/:studioId/invoices/:invoiceId', (req: Request, res: Response) => {
  const { studioId, invoiceId } = req.params
  const inv = db.prepare(
    'SELECT * FROM invoices WHERE studio_id = ? AND id = ?'
  ).get(studioId, invoiceId) as Record<string, unknown> | undefined

  if (!inv) {
    return res.status(404).json({ message: 'Invoice not found' })
  }

  res.json({
    id: inv.id,
    studioId: inv.studio_id,
    invoiceNumber: inv.invoice_number,
    amountDueCents: inv.amount_due_cents,
    amountPaidCents: inv.amount_paid_cents,
    currency: inv.currency,
    status: inv.status,
    issuedAt: inv.issued_at,
    dueAt: inv.due_at,
    lineItems: parseJson<Array<{ description: string; quantity: number; unitAmountCents: number }>>(
      inv.line_items as string
    ) ?? [],
  })
})

billingRouter.get('/studios/:studioId/invoices/:invoiceId/pdf', (req: Request, res: Response) => {
  const { studioId, invoiceId } = req.params
  const inv = db.prepare(
    'SELECT * FROM invoices WHERE studio_id = ? AND id = ?'
  ).get(studioId, invoiceId) as Record<string, unknown> | undefined

  if (!inv) {
    return res.status(404).send('Invoice not found')
  }

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="invoice-${inv.invoice_number}.pdf"`)
  res.send(Buffer.from('%PDF-1.4 mock invoice'))
})

billingRouter.post('/studios/:studioId/invoices/:invoiceId/resend', (req: Request, res: Response) => {
  res.json({ message: 'Invoice resent to billing email' })
})

billingRouter.get('/studios/:studioId/payment-methods', (req: Request, res: Response) => {
  const { studioId } = req.params
  ensureStudio(studioId)

  const rows = db.prepare(
    'SELECT * FROM payment_methods WHERE studio_id = ? ORDER BY is_default DESC, created_at ASC'
  ).all(studioId) as Record<string, unknown>[]

  res.json(
    rows.map((r) => ({
      id: r.id,
      studioId: r.studio_id,
      brand: r.brand,
      last4: r.last4,
      expMonth: r.exp_month,
      expYear: r.exp_year,
      isDefault: Boolean(r.is_default),
      createdAt: r.created_at,
    }))
  )
})

billingRouter.post('/studios/:studioId/payment-methods', (req: Request, res: Response) => {
  const { studioId } = req.params
  const { providerToken } = req.body
  ensureStudio(studioId)

  const adapter = getPaymentAdapter()
  adapter
    .createPaymentMethod(providerToken ?? 'pm_mock_' + Date.now())
    .then((pm) => {
      const id = `pm_${studioId}_${Date.now()}`
      const isFirst = !db.prepare('SELECT 1 FROM payment_methods WHERE studio_id = ?').get(studioId)
      db.prepare(
        `INSERT INTO payment_methods (id, studio_id, provider_payment_method_id, brand, last4, exp_month, exp_year, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, studioId, pm.id, pm.brand, pm.last4, pm.expMonth, pm.expYear, isFirst ? 1 : 0)

      const row = db.prepare('SELECT * FROM payment_methods WHERE id = ?').get(id) as Record<string, unknown>
      res.status(201).json({
        id: row.id,
        studioId: row.studio_id,
        brand: row.brand,
        last4: row.last4,
        expMonth: row.exp_month,
        expYear: row.exp_year,
        isDefault: Boolean(row.is_default),
        createdAt: row.created_at,
      })
    })
    .catch((err) => {
      res.status(400).json({ message: err?.message ?? 'Failed to add payment method' })
    })
})

billingRouter.delete('/studios/:studioId/payment-methods/:methodId', (req: Request, res: Response) => {
  const { studioId, methodId } = req.params
  db.prepare('DELETE FROM payment_methods WHERE studio_id = ? AND id = ?').run(studioId, methodId)
  res.status(204).send()
})

billingRouter.post('/studios/:studioId/payment-methods/:methodId/default', (req: Request, res: Response) => {
  const { studioId, methodId } = req.params
  db.prepare('UPDATE payment_methods SET is_default = 0 WHERE studio_id = ?').run(studioId)
  db.prepare('UPDATE payment_methods SET is_default = 1 WHERE studio_id = ? AND id = ?').run(studioId, methodId)
  const row = db.prepare(
    'SELECT * FROM payment_methods WHERE studio_id = ? AND id = ?'
  ).get(studioId, methodId) as Record<string, unknown>
  if (row) {
    res.json({
      id: row.id,
      studioId: row.studio_id,
      brand: row.brand,
      last4: row.last4,
      expMonth: row.exp_month,
      expYear: row.exp_year,
      isDefault: true,
      createdAt: row.created_at,
    })
  } else {
    res.status(404).json({ message: 'Payment method not found' })
  }
})

billingRouter.post('/studios/:studioId/promos/apply', (req: Request, res: Response) => {
  const { studioId } = req.params
  const { code } = req.body
  if (!code || typeof code !== 'string' || code.length < 4 || code.length > 32) {
    return res.status(400).json({ message: 'Invalid promo code' })
  }
  res.json({ message: 'Promo applied', creditBalanceCents: 1000 })
})

billingRouter.post('/studios/:studioId/billing/contact', (req: Request, res: Response) => {
  const { studioId } = req.params
  const { name, email, companyName, address } = req.body
  ensureStudio(studioId)

  const contactId = `bc_${studioId}`
  const existing = db.prepare(
    'SELECT id FROM billing_contacts WHERE studio_id = ?'
  ).get(studioId) as { id: string } | undefined

  const addr = address ?? {}
  const now = new Date().toISOString()

  if (existing) {
    db.prepare(
      `UPDATE billing_contacts SET name = ?, email = ?, company_name = ?, address_line1 = ?, address_line2 = ?, address_city = ?, address_state = ?, address_postal_code = ?, address_country = ?, updated_at = ?
       WHERE studio_id = ?`
    ).run(
      name ?? '',
      email ?? '',
      companyName ?? null,
      addr.line1 ?? null,
      addr.line2 ?? null,
      addr.city ?? null,
      addr.state ?? null,
      addr.postalCode ?? null,
      addr.country ?? null,
      now,
      studioId
    )
  } else {
    db.prepare(
      `INSERT INTO billing_contacts (id, studio_id, name, email, company_name, address_line1, address_line2, address_city, address_state, address_postal_code, address_country, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      contactId,
      studioId,
      name ?? '',
      email ?? '',
      companyName ?? null,
      addr.line1 ?? null,
      addr.line2 ?? null,
      addr.city ?? null,
      addr.state ?? null,
      addr.postalCode ?? null,
      addr.country ?? null,
      now
    )
  }

  const row = db.prepare(
    'SELECT * FROM billing_contacts WHERE studio_id = ?'
  ).get(studioId) as Record<string, unknown>
  res.json({
    id: row.id,
    studioId: row.studio_id,
    name: row.name,
    email: row.email,
    companyName: row.company_name,
    address: {
      line1: row.address_line1,
      line2: row.address_line2,
      city: row.address_city,
      state: row.address_state,
      postalCode: row.address_postal_code,
      country: row.address_country,
    },
  })
})
