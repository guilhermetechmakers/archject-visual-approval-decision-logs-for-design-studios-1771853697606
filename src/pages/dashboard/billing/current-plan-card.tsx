import { Link } from 'react-router-dom'
import { CreditCard, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useBillingSummary } from '@/hooks/use-billing'
import type { SubscriptionStatus } from '@/types/billing'

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function StatusPill({ status }: { status: SubscriptionStatus }) {
  const config: Record<SubscriptionStatus, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' }> = {
    active: { label: 'Active', variant: 'success' },
    trialing: { label: 'Trial', variant: 'warning' },
    canceled: { label: 'Canceled', variant: 'secondary' },
    past_due: { label: 'Past due', variant: 'destructive' },
    unpaid: { label: 'Unpaid', variant: 'destructive' },
  }
  const { label, variant } = config[status] ?? config.active
  return <Badge variant={variant}>{label}</Badge>
}

export function CurrentPlanCard() {
  const { data, isLoading } = useBillingSummary()

  if (isLoading) {
    return (
      <Card className="card-hover">
        <CardHeader className="flex flex-row items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-16" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-8 w-24" />
        </CardContent>
      </Card>
    )
  }

  const sub = data?.subscription
  const canManage = data?.canManageBilling ?? true

  return (
    <Card className="card-hover">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          Current plan
        </CardTitle>
        {sub && <StatusPill status={sub.status} />}
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-2xl font-semibold">{sub?.planName ?? 'Free'}</p>
          <p className="text-sm text-muted-foreground">
            {sub
              ? `${sub.seatsUsed} of ${sub.seats} seats used`
              : '2 seats included'}
          </p>
        </div>

        {sub && sub.seats > 0 && (
          <div className="space-y-2">
            <Progress value={sub.seatsUsed} max={sub.seats} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {sub.seatsUsed} of {sub.seats} seats used
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>Next billing: {formatDate(sub?.nextBillingDate ?? null)}</span>
          {sub?.billingCycle && (
            <span className="capitalize">{sub.billingCycle}</span>
          )}
          {sub && sub.pricePerSeatCents > 0 && (
            <span>{formatCurrency(sub.pricePerSeatCents)}/seat</span>
          )}
        </div>

        {canManage && (
          <div className="flex justify-end pt-2">
            <Link to="/dashboard/billing#pricing">
              <Button size="sm" className="gap-1">
                Upgrade / Manage seats
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
