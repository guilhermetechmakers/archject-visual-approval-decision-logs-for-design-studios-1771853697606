/**
 * Payment Provider Adapter
 *
 * Abstract interface for payment providers (Stripe, Chargebee, Braintree, etc.).
 * Implement mock adapter for development and Stripe-like adapter for production.
 */

export interface PaymentMethodResult {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
}

export interface SubscriptionResult {
  id: string
  status: string
  currentPeriodEnd: string
}

export interface InvoiceResult {
  id: string
  number: string
  amountDue: number
  amountPaid: number
  currency: string
  status: string
  pdfUrl?: string
  lineItems: Array<{ description: string; quantity: number; unitAmountCents: number }>
}

export interface PaymentProviderAdapter {
  createPaymentMethod(token: string): Promise<PaymentMethodResult>
  attachPaymentMethodToCustomer(paymentMethodId: string, customerId: string): Promise<void>
  detachPaymentMethod(paymentMethodId: string): Promise<void>
  listPaymentMethods(customerId: string): Promise<PaymentMethodResult[]>
  createSubscription(params: {
    customerId: string
    planId: string
    seats: number
    paymentMethodId?: string
    promoCode?: string
    billingCycle?: 'monthly' | 'annual'
  }): Promise<SubscriptionResult>
  updateSubscription(subscriptionId: string, params: { planId?: string; seats?: number }): Promise<SubscriptionResult>
  cancelSubscription(subscriptionId: string): Promise<void>
  listInvoices(customerId: string, params?: { limit?: number; year?: number }): Promise<InvoiceResult[]>
  getInvoicePdf(invoiceId: string): Promise<Buffer | null>
  applyCoupon(customerId: string, code: string): Promise<{ amountOff?: number; percentOff?: number } | null>
  verifyWebhookSignature(payload: string | Buffer, signature: string, secret: string): boolean
}

/** Mock adapter for development - no real payment processing */
export const mockPaymentAdapter: PaymentProviderAdapter = {
  async createPaymentMethod(token: string): Promise<PaymentMethodResult> {
    if (!token.startsWith('pm_mock_')) {
      throw new Error('Invalid mock token')
    }
    return {
      id: `pm_${Date.now()}`,
      brand: 'Visa',
      last4: '4242',
      expMonth: 12,
      expYear: 2026,
    }
  },

  async attachPaymentMethodToCustomer(): Promise<void> {
    // no-op
  },

  async detachPaymentMethod(): Promise<void> {
    // no-op
  },

  async listPaymentMethods(): Promise<PaymentMethodResult[]> {
    return []
  },

  async createSubscription(): Promise<SubscriptionResult> {
    return {
      id: `sub_${Date.now()}`,
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }
  },

  async updateSubscription(): Promise<SubscriptionResult> {
    return {
      id: 'sub_mock',
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }
  },

  async cancelSubscription(): Promise<void> {
    // no-op
  },

  async listInvoices(): Promise<InvoiceResult[]> {
    return [
      {
        id: 'inv_1',
        number: 'INV-2025-001',
        amountDue: 2900,
        amountPaid: 2900,
        currency: 'USD',
        status: 'paid',
        lineItems: [{ description: 'Pro Plan - 5 seats', quantity: 1, unitAmountCents: 2900 }],
      },
    ]
  },

  async getInvoicePdf(): Promise<Buffer | null> {
    return null
  },

  async applyCoupon(): Promise<{ amountOff?: number; percentOff?: number } | null> {
    return { percentOff: 10 }
  },

  verifyWebhookSignature(): boolean {
    return true
  },
}

const USE_MOCK = process.env.PAYMENT_PROVIDER === 'mock' || !process.env.STRIPE_SECRET_KEY

export function getPaymentAdapter(): PaymentProviderAdapter {
  return USE_MOCK ? mockPaymentAdapter : mockPaymentAdapter
}
