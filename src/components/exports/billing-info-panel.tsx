import { useQuery } from '@tanstack/react-query'
import { CreditCard, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getDashboardMetrics } from '@/api/dashboard'

export function BillingInfoPanel() {
  const { data: metrics } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: getDashboardMetrics,
  })

  const credits = metrics?.exportCredits ?? 100
  const isLow = credits < 20

  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Export credits
        </CardTitle>
        <CardDescription>
          Remaining credits for this billing period
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                isLow ? 'bg-warning/20' : 'bg-primary/10'
              }`}
            >
              <Zap
                className={`h-6 w-6 ${isLow ? 'text-warning' : 'text-primary'}`}
              />
            </div>
            <div>
              <p className="text-2xl font-bold">{credits}</p>
              <p className="text-sm text-muted-foreground">credits remaining</p>
            </div>
          </div>
          {isLow && (
            <p className="text-sm text-warning">
              Running low — consider upgrading
            </p>
          )}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Each PDF or CSV export uses 1 credit. Credits reset monthly on paid plans.
        </p>
      </CardContent>
    </Card>
  )
}
