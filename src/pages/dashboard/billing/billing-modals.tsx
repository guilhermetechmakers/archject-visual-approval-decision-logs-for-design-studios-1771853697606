import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useAddPaymentMethod,
  useRemovePaymentMethod,
  useCreateSubscription,
  useBillingSummary,
  useInvoice,
} from '@/hooks/use-billing'
import { PLANS } from '@/types/billing'

function formatPrice(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100)
}

interface AddPaymentMethodModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddPaymentMethodModal({ open, onOpenChange }: AddPaymentMethodModalProps) {
  const [token, setToken] = useState('')
  const addMutation = useAddPaymentMethod()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addMutation.mutate(token || 'mock_pm_token', {
      onSuccess: () => {
        setToken('')
        onOpenChange(false)
      },
    })
  }

  return (
    <Dialog open={open}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>Add payment method</DialogTitle>
          <DialogDescription>Add a new card for billing. In production, this would use a secure payment element.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pm-token">Payment token</Label>
            <Input
              id="pm-token"
              placeholder="Mock: leave empty or enter token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Development: Uses mock token if empty. Production would use Stripe Elements.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addMutation.isPending}>
              Add card
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface ConfirmRemoveCardModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paymentMethod: { id: string; brand: string; last4: string } | null
  onConfirm: () => void
}

export function ConfirmRemoveCardModal({
  open,
  onOpenChange,
  paymentMethod,
  onConfirm,
}: ConfirmRemoveCardModalProps) {
  const removeMutation = useRemovePaymentMethod()

  const handleRemove = () => {
    if (!paymentMethod) return
    removeMutation.mutate(paymentMethod.id, {
      onSuccess: () => {
        onOpenChange(false)
        onConfirm()
      },
    })
  }

  if (!paymentMethod) return null

  return (
    <Dialog open={open}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>Remove payment method</DialogTitle>
          <DialogDescription>Remove {paymentMethod.brand} •••• {paymentMethod.last4}?</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={removeMutation.isPending}
            >
              Remove
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface UpgradeConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tier: { id: string; name: string; slug: string } | null
  billingCycle: 'monthly' | 'annual'
  onConfirm: () => void
}

export function UpgradeConfirmModal({
  open,
  onOpenChange,
  tier,
  billingCycle,
  onConfirm,
}: UpgradeConfirmModalProps) {
  const createMutation = useCreateSubscription()
  const { data: summary } = useBillingSummary()
  const hasPaymentMethod = (summary?.defaultPaymentMethod ?? null) !== null

  const price =
    tier && billingCycle === 'annual'
      ? Math.round((PLANS.find((p) => p.slug === tier.slug)?.annualPriceCents ?? 0) / 12)
      : PLANS.find((p) => p.slug === tier?.slug)?.monthlyPriceCents ?? 0

  const handleConfirm = () => {
    if (!tier || tier.slug === 'free') return
    createMutation.mutate(
      {
        planId: tier.slug,
        seats: PLANS.find((p) => p.slug === tier.slug)?.maxSeats ?? 5,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          onConfirm()
        },
      }
    )
  }

  if (!tier) return null

  const plan = PLANS.find((p) => p.slug === tier.slug)

  return (
    <Dialog open={open}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>Confirm upgrade</DialogTitle>
          <DialogDescription>Upgrade to {tier.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Estimated first charge</p>
            <p className="text-2xl font-bold">{formatPrice(price)}/mo</p>
            <p className="text-xs text-muted-foreground">
              {billingCycle === 'annual' ? 'Billed annually' : 'Billed monthly'}
              {plan && ` · Up to ${plan.maxSeats} seats`}
            </p>
          </div>
          {!hasPaymentMethod && (
            <p className="text-sm text-warning">
              You'll need to add a payment method to complete this upgrade.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={createMutation.isPending || tier.slug === 'free'}
            >
              Confirm upgrade
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface InvoiceDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceId: string | null
  invoiceNumber: string
}

export function InvoiceDetailModal({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
}: InvoiceDetailModalProps) {
  const { data: invoice, isLoading } = useInvoice(invoiceId)

  return (
    <Dialog open={open}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>Invoice {invoiceNumber}</DialogTitle>
          <DialogDescription>
            {invoice ? `Issued ${new Date(invoice.issuedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {isLoading ? (
            <p className="text-muted-foreground">Loading invoice details...</p>
          ) : invoice ? (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">
                  {formatPrice(invoice.amountDueCents, invoice.currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="capitalize">{invoice.status}</span>
              </div>
              {invoice.lineItems && invoice.lineItems.length > 0 && (
                <div className="border-t border-border pt-4">
                  <p className="mb-2 text-sm font-medium">Line items</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {invoice.lineItems.map((item, i) => (
                      <li key={i}>
                        {item.description} × {item.quantity} —{' '}
                        {formatPrice(item.unitAmountCents * item.quantity, invoice.currency)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

