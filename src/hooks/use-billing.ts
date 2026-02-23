import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { billingApi } from '@/api/billing'

const STUDIO_ID = 'default'

export function useBillingSummary() {
  return useQuery({
    queryKey: ['billing', 'summary', STUDIO_ID],
    queryFn: () => billingApi.getSummary(STUDIO_ID),
  })
}

export function useSubscription() {
  return useQuery({
    queryKey: ['billing', 'subscription', STUDIO_ID],
    queryFn: () => billingApi.getSubscription(STUDIO_ID),
  })
}

export function useInvoices(params?: { page?: number; perPage?: number; year?: number }) {
  return useQuery({
    queryKey: ['billing', 'invoices', STUDIO_ID, params],
    queryFn: () => billingApi.getInvoices(STUDIO_ID, params),
  })
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: ['billing', 'payment-methods', STUDIO_ID],
    queryFn: () => billingApi.getPaymentMethods(STUDIO_ID),
  })
}

export function useCreateSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { planId: string; seats: number; paymentMethodId?: string; promoCode?: string }) =>
      billingApi.createSubscription(STUDIO_ID, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      toast.success('Subscription updated successfully')
    },
    onError: (err: { message?: string }) => {
      toast.error(err?.message ?? 'Failed to update subscription')
    },
  })
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { planId?: string; seats?: number }) =>
      billingApi.updateSubscription(STUDIO_ID, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      toast.success('Subscription updated')
    },
    onError: (err: { message?: string }) => {
      toast.error(err?.message ?? 'Failed to update subscription')
    },
  })
}

export function useAddPaymentMethod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (providerToken: string) => billingApi.addPaymentMethod(STUDIO_ID, providerToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      toast.success('Payment method added')
    },
    onError: (err: { message?: string }) => {
      toast.error(err?.message ?? 'Failed to add payment method')
    },
  })
}

export function useRemovePaymentMethod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (methodId: string) => billingApi.removePaymentMethod(STUDIO_ID, methodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      toast.success('Payment method removed')
    },
    onError: (err: { message?: string }) => {
      toast.error(err?.message ?? 'Failed to remove payment method')
    },
  })
}

export function useSetDefaultPaymentMethod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (methodId: string) => billingApi.setDefaultPaymentMethod(STUDIO_ID, methodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      toast.success('Default payment method updated')
    },
    onError: (err: { message?: string }) => {
      toast.error(err?.message ?? 'Failed to update default payment method')
    },
  })
}

export function useApplyPromo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (code: string) => billingApi.applyPromo(STUDIO_ID, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      toast.success('Promo code applied')
    },
    onError: (err: { message?: string }) => {
      toast.error(err?.message ?? 'Invalid or expired promo code')
    },
  })
}

export function useInvoice(invoiceId: string | null) {
  return useQuery({
    queryKey: ['billing', 'invoice', STUDIO_ID, invoiceId],
    queryFn: () => billingApi.getInvoice(STUDIO_ID, invoiceId!),
    enabled: !!invoiceId,
  })
}

export function useUpdateBillingContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: Parameters<typeof billingApi.updateBillingContact>[1]) =>
      billingApi.updateBillingContact(STUDIO_ID, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      toast.success('Billing contact updated')
    },
    onError: (err: { message?: string }) => {
      toast.error(err?.message ?? 'Failed to update billing contact')
    },
  })
}
