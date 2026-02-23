import { api } from '@/lib/api'
import type {
  BillingSummary,
  Invoice,
  PaymentMethod,
  BillingContact,
  Subscription,
  PricingTier,
} from '@/types/billing'

const DEFAULT_STUDIO_ID = 'default'

function studioPath(studioId?: string) {
  return `/studios/${studioId ?? DEFAULT_STUDIO_ID}`
}

export const billingApi = {
  getSummary: (studioId?: string) =>
    api.get<BillingSummary>(`${studioPath(studioId)}/billing`),

  getSubscription: (studioId?: string) =>
    api.get<Subscription | null>(`${studioPath(studioId)}/subscription`),

  createSubscription: (
    studioId: string | undefined,
    body: { planId: string; seats: number; paymentMethodId?: string; promoCode?: string }
  ) =>
    api.post<Subscription>(`${studioPath(studioId)}/subscription`, body),

  updateSubscription: (
    studioId: string | undefined,
    body: { planId?: string; seats?: number }
  ) =>
    api.patch<Subscription>(`${studioPath(studioId)}/subscription`, body),

  cancelSubscription: (studioId?: string) =>
    api.post<{ message: string }>(`${studioPath(studioId)}/subscription/cancel`),

  getInvoices: (
    studioId?: string,
    params?: { page?: number; perPage?: number; year?: number; status?: string }
  ) => {
    const search = new URLSearchParams()
    if (params?.page != null) search.set('page', String(params.page))
    if (params?.perPage != null) search.set('perPage', String(params.perPage))
    if (params?.year != null) search.set('year', String(params.year))
    if (params?.status) search.set('status', params.status)
    const qs = search.toString()
    return api.get<{ invoices: Invoice[]; total: number }>(
      `${studioPath(studioId)}/invoices${qs ? `?${qs}` : ''}`
    )
  },

  getInvoice: (studioId: string | undefined, invoiceId: string) =>
    api.get<Invoice>(`${studioPath(studioId)}/invoices/${invoiceId}`),

  downloadInvoicePdf: async (studioId: string | undefined, invoiceId: string): Promise<void> => {
    const API_BASE = import.meta.env.VITE_API_URL ?? '/api'
    const path = `${studioPath(studioId)}/invoices/${invoiceId}/pdf`
    const url = path.startsWith('http') ? path : `${API_BASE}${path}`
    const token = localStorage.getItem('auth_token')
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error('Failed to download')
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `invoice-${invoiceId}.pdf`
    a.click()
    URL.revokeObjectURL(blobUrl)
  },

  resendInvoice: (studioId: string | undefined, invoiceId: string) =>
    api.post<{ message: string }>(`${studioPath(studioId)}/invoices/${invoiceId}/resend`),

  getPaymentMethods: (studioId?: string) =>
    api.get<PaymentMethod[]>(`${studioPath(studioId)}/payment-methods`),

  addPaymentMethod: (studioId: string | undefined, providerToken: string) =>
    api.post<PaymentMethod>(`${studioPath(studioId)}/payment-methods`, {
      providerToken,
    }),

  removePaymentMethod: (studioId: string | undefined, methodId: string) =>
    api.delete(`${studioPath(studioId)}/payment-methods/${methodId}`),

  setDefaultPaymentMethod: (studioId: string | undefined, methodId: string) =>
    api.post<PaymentMethod>(`${studioPath(studioId)}/payment-methods/${methodId}/default`),

  applyPromo: (studioId: string | undefined, code: string) =>
    api.post<{ message: string; creditBalanceCents: number }>(
      `${studioPath(studioId)}/promos/apply`,
      { code }
    ),

  updateBillingContact: (
    studioId: string | undefined,
    body: Partial<BillingContact & { address: Partial<BillingContact['address']> }>
  ) =>
    api.post<BillingContact>(`${studioPath(studioId)}/billing/contact`, body),

  getPlans: () => api.get<PricingTier[]>('/plans'),
}
