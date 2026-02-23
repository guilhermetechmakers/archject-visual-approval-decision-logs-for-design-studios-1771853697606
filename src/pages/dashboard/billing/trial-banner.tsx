import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBillingSummary } from '@/hooks/use-billing'
import { cn } from '@/lib/utils'

export function TrialBanner() {
  const { data } = useBillingSummary()
  const sub = data?.subscription

  if (!sub) return null

  const isPastDue = sub.status === 'past_due' || sub.status === 'unpaid'
  const isTrialing = sub.status === 'trialing' && sub.trialEndsAt

  if (isPastDue) {
    return (
      <div
        className={cn(
          'mb-6 flex flex-col gap-4 rounded-xl border border-destructive/50 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between'
        )}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="font-medium">Payment past due</p>
            <p className="text-sm text-muted-foreground">
              Please update your payment method to restore your subscription
            </p>
          </div>
        </div>
        <Link to="/dashboard/billing#payment-methods">
          <Button variant="destructive">
            Restore payment
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    )
  }

  if (!isTrialing) return null

  const trialEnd = new Date(sub.trialEndsAt!)
  const now = new Date()
  const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between'
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="font-medium">Trial period</p>
          <p className="text-sm text-muted-foreground">
            {daysLeft > 0
              ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left in your trial. Upgrade to keep your features.`
              : 'Your trial has ended. Upgrade to continue.'}
          </p>
        </div>
      </div>
      <Link to="/dashboard/billing#pricing">
        <Button>
          Upgrade now
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    </div>
  )
}
