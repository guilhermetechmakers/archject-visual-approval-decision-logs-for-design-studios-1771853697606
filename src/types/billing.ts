/** Billing & subscription types for Archject */

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'canceled'
  | 'past_due'
  | 'unpaid'

export type BillingCycle = 'monthly' | 'annual'

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'failed'

export interface BillingSummary {
  subscription: Subscription | null
  billingContact: BillingContact | null
  creditBalanceCents: number
  defaultPaymentMethod: PaymentMethod | null
  canManageBilling: boolean
}

export interface Subscription {
  id: string
  studioId: string
  planId: string
  planName: string
  seats: number
  seatsUsed: number
  status: SubscriptionStatus
  pricePerSeatCents: number
  billingCycle: BillingCycle
  nextBillingDate: string | null
  trialEndsAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Invoice {
  id: string
  studioId: string
  invoiceNumber: string
  amountDueCents: number
  amountPaidCents: number
  currency: string
  status: InvoiceStatus
  issuedAt: string
  dueAt: string | null
  lineItems: InvoiceLineItem[]
}

export interface InvoiceLineItem {
  description: string
  quantity: number
  unitAmountCents: number
}

export interface PaymentMethod {
  id: string
  studioId: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
  isDefault: boolean
  createdAt: string
}

export interface BillingContact {
  id: string
  studioId: string
  name: string
  email: string
  companyName?: string
  address: BillingAddress
}

export interface BillingAddress {
  line1: string
  line2?: string
  city: string
  state?: string
  postalCode: string
  country: string
}

export interface PromoCredit {
  id: string
  code: string
  amountCents?: number
  percentOff?: number
  expiresAt?: string
  appliedToNextInvoice: boolean
}

export interface PricingTier {
  id: string
  name: string
  slug: string
  monthlyPriceCents: number
  annualPriceCents: number
  seatsIncluded: number
  maxSeats: number
  features: string[]
}

export const PLANS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    slug: 'free',
    monthlyPriceCents: 0,
    annualPriceCents: 0,
    seatsIncluded: 2,
    maxSeats: 2,
    features: ['Up to 2 team members', '3 active projects', 'Basic approval workflow', 'Email support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    slug: 'pro',
    monthlyPriceCents: 2900,
    annualPriceCents: 29000,
    seatsIncluded: 5,
    maxSeats: 20,
    features: ['Up to 20 team members', 'Unlimited projects', 'Advanced workflows', 'Priority support', 'Custom branding'],
  },
  {
    id: 'studio',
    name: 'Studio',
    slug: 'studio',
    monthlyPriceCents: 7900,
    annualPriceCents: 79000,
    seatsIncluded: 10,
    maxSeats: 100,
    features: ['Up to 100 team members', 'Unlimited projects', 'Full workflow automation', 'Dedicated support', 'API access', 'SSO'],
  },
]
