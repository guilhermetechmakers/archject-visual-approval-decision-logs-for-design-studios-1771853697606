import { Users, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface SeatManagementProps {
  seatsUsed: number
  maxSeats: number
  className?: string
}

export function SeatManagement({ seatsUsed, maxSeats, className }: SeatManagementProps) {
  const isNearLimit = maxSeats > 0 && seatsUsed >= maxSeats * 0.9
  const isAtLimit = maxSeats > 0 && seatsUsed >= maxSeats

  return (
    <Card className={cn('card-hover', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-muted-foreground" />
          Seat management
        </CardTitle>
        <CardDescription>
          Current seats used vs. allocated. Upgrade your plan to add more seats.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
          <span className="text-sm font-medium">Seats used</span>
          <span className="font-semibold">
            {seatsUsed} / {maxSeats > 0 ? maxSeats : '∞'}
          </span>
        </div>
        {maxSeats > 0 && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                isAtLimit ? 'bg-destructive' : isNearLimit ? 'bg-warning' : 'bg-primary'
              )}
              style={{
                width: `${Math.min(100, (seatsUsed / maxSeats) * 100)}%`,
              }}
            />
          </div>
        )}
        {isAtLimit && (
          <div
            className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Seat limit reached. Upgrade your plan to invite more members.</span>
          </div>
        )}
        {isNearLimit && !isAtLimit && (
          <div
            className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning"
            role="alert"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Approaching seat limit ({maxSeats - seatsUsed} seats remaining).</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
