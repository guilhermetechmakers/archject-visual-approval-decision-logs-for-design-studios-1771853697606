import { useState } from 'react'
import { Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useBillingSummary } from '@/hooks/use-billing'
import { cn } from '@/lib/utils'
import { PLANS, type PricingTier } from '@/types/billing'

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

interface TierCardProps {
  tier: PricingTier
  isAnnual: boolean
  isCurrentPlan: boolean
  onUpgrade: (tier: PricingTier) => void
}

function TierCard({ tier, isAnnual, isCurrentPlan, onUpgrade }: TierCardProps) {
  const price = isAnnual ? tier.annualPriceCents : tier.monthlyPriceCents
  const monthlyEquivalent = isAnnual ? Math.round(tier.annualPriceCents / 12) : tier.monthlyPriceCents
  const savings = isAnnual && tier.annualPriceCents > 0
    ? Math.round((1 - tier.annualPriceCents / (tier.monthlyPriceCents * 12)) * 100)
    : 0

  return (
    <Card
      className={cn(
        'card-hover flex flex-col transition-all duration-200',
        isCurrentPlan && 'ring-2 ring-primary'
      )}
    >
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">{tier.name}</CardTitle>
        <div className="mt-2">
          <span className="text-3xl font-bold">{formatCurrency(price)}</span>
          <span className="text-muted-foreground">
            /{isAnnual ? 'year' : 'month'}
          </span>
          {savings > 0 && (
            <p className="mt-1 text-sm text-success">Save {savings}% with annual</p>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Up to {tier.maxSeats} seats · {formatCurrency(monthlyEquivalent)}/mo
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <ul className="space-y-3">
          {tier.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 shrink-0 text-success mt-0.5" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 pt-4">
          <Button
            className="w-full"
            variant={isCurrentPlan ? 'outline' : 'default'}
            disabled={isCurrentPlan}
            onClick={() => onUpgrade(tier)}
          >
            {isCurrentPlan ? 'Current plan' : tier.slug === 'free' ? 'Current' : 'Upgrade'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function PricingTiersGrid() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const { data } = useBillingSummary()
  const currentPlanId = data?.subscription?.planId ?? 'free'

  const handleUpgrade = (tier: PricingTier) => {
    if (tier.slug === 'free') return
    const event = new CustomEvent('billing:upgrade', { detail: { tier, billingCycle } })
    window.dispatchEvent(event)
  }

  return (
    <Card className="card-hover">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Pricing tiers</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Compare plans and choose the right one for your studio
          </p>
        </div>
        <Tabs value={billingCycle} onValueChange={(v) => setBillingCycle(v as 'monthly' | 'annual')}>
          <TabsList>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="annual">Annual</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div
          id="pricing"
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 scroll-mt-8"
        >
          {PLANS.map((tier) => (
            <TierCard
              key={tier.id}
              tier={tier}
              isAnnual={billingCycle === 'annual'}
              isCurrentPlan={currentPlanId === tier.slug}
              onUpgrade={handleUpgrade}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
