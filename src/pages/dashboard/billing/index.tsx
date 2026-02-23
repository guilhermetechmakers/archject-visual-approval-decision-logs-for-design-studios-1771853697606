import { useEffect, useState } from 'react'
import { useBillingSummary } from '@/hooks/use-billing'
import { CurrentPlanCard } from './current-plan-card'
import { PricingTiersGrid } from './pricing-tiers-grid'
import { InvoicesList } from './invoices-list'
import { PaymentMethodsList } from './payment-methods-list'
import { PromoCreditsCard } from './promo-credits-card'
import { BillingContactForm } from './billing-contact-form'
import { TrialBanner } from './trial-banner'
import {
  AddPaymentMethodModal,
  ConfirmRemoveCardModal,
  UpgradeConfirmModal,
  InvoiceDetailModal,
} from './billing-modals'
import type { PaymentMethod } from '@/types/billing'
import type { Invoice } from '@/types/billing'

export function BillingPage() {
  const [addPmOpen, setAddPmOpen] = useState(false)
  const [removePmOpen, setRemovePmOpen] = useState(false)
  const [pmToRemove, setPmToRemove] = useState<PaymentMethod | null>(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [upgradeTier, setUpgradeTier] = useState<{ id: string; name: string; slug: string } | null>(null)
  const [upgradeBillingCycle, setUpgradeBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [invoiceDetailOpen, setInvoiceDetailOpen] = useState(false)
  const [invoiceDetail, setInvoiceDetail] = useState<{ id: string; invoiceNumber: string } | null>(null)

  useEffect(() => {
    const onAddPm = () => setAddPmOpen(true)
    const onRemovePm = (e: Event) => {
      const pm = (e as CustomEvent<PaymentMethod>).detail
      setPmToRemove(pm)
      setRemovePmOpen(true)
    }
    const onUpgrade = (e: Event) => {
      type UpgradeDetail = { tier: { id: string; name: string; slug: string }; billingCycle: 'monthly' | 'annual' }
      const { tier, billingCycle } = (e as CustomEvent<UpgradeDetail>).detail
      setUpgradeTier(tier)
      setUpgradeBillingCycle(billingCycle)
      setUpgradeOpen(true)
    }
    const onInvoiceDetail = (e: Event) => {
      const inv = (e as CustomEvent<Invoice>).detail
      setInvoiceDetail({ id: inv.id, invoiceNumber: inv.invoiceNumber })
      setInvoiceDetailOpen(true)
    }

    window.addEventListener('billing:add-payment-method', onAddPm)
    window.addEventListener('billing:remove-payment-method', onRemovePm)
    window.addEventListener('billing:upgrade', onUpgrade)
    window.addEventListener('billing:invoice-detail', onInvoiceDetail)

    return () => {
      window.removeEventListener('billing:add-payment-method', onAddPm)
      window.removeEventListener('billing:remove-payment-method', onRemovePm)
      window.removeEventListener('billing:upgrade', onUpgrade)
      window.removeEventListener('billing:invoice-detail', onInvoiceDetail)
    }
  }, [])

  const { isError } = useBillingSummary()

  if (isError) {
    return (
      <div className="min-h-screen bg-[#F7F7F9]">
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6">
          <p className="font-medium">Unable to load billing</p>
          <p className="text-sm text-muted-foreground mt-1">
            Please log in to view and manage your billing.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F7F9]">
      <div className="space-y-8 animate-in">
        <div>
          <h1 className="text-2xl font-bold">Billing & pricing</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your subscription, payment methods, and invoices
          </p>
        </div>

        <TrialBanner />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <CurrentPlanCard />
          </div>
          <div className="lg:col-span-2">
            <PromoCreditsCard />
          </div>
        </div>

        <PricingTiersGrid />

        <InvoicesList />

        <div className="grid gap-6 lg:grid-cols-2">
          <PaymentMethodsList />
          <BillingContactForm />
        </div>
      </div>

      <AddPaymentMethodModal open={addPmOpen} onOpenChange={setAddPmOpen} />
      <ConfirmRemoveCardModal
        open={removePmOpen}
        onOpenChange={setRemovePmOpen}
        paymentMethod={pmToRemove}
        onConfirm={() => {
          setRemovePmOpen(false)
          setPmToRemove(null)
        }}
      />
      <UpgradeConfirmModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        tier={upgradeTier}
        billingCycle={upgradeBillingCycle}
        onConfirm={() => {
          setUpgradeOpen(false)
          setUpgradeTier(null)
        }}
      />
      <InvoiceDetailModal
        open={invoiceDetailOpen}
        onOpenChange={setInvoiceDetailOpen}
        invoiceId={invoiceDetail?.id ?? null}
        invoiceNumber={invoiceDetail?.invoiceNumber ?? ''}
      />
    </div>
  )
}
