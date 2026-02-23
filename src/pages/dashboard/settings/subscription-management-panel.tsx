import { Link } from 'react-router-dom'
import { CreditCard, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useBillingSummary } from '@/hooks/use-billing'
import { Skeleton } from '@/components/ui/skeleton'

export function SubscriptionManagementPanel() {
  const { data, isLoading } = useBillingSummary()

  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          Subscription
        </CardTitle>
        <CardDescription>
          Manage your plan, seats, and billing
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{data?.subscription?.planName ?? 'Free'}</p>
              <p className="text-sm text-muted-foreground">
                {data?.subscription
                  ? `${data.subscription.seatsUsed} of ${data.subscription.seats} seats used`
                  : '2 seats included'}
              </p>
            </div>
            <Link to="/dashboard/billing">
              <Button variant="outline" size="sm">
                Manage billing
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
