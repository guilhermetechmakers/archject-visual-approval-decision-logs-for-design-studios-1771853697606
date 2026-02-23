import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, UserCheck, UserX, Mail } from 'lucide-react'
import { adminApi } from '@/api/admin'
import { cn } from '@/lib/utils'

interface AnalyticsCardsProps {
  onKpiClick?: (filter: { status?: string }) => void
  className?: string
}

export function AnalyticsCards({ onKpiClick, className }: AnalyticsCardsProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'users'],
    queryFn: () => adminApi.getAnalyticsUsers('30d'),
  })

  const kpis = data?.kpis ?? {
    totalUsers: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    pendingInvites: 0,
  }

  const cards = [
    {
      title: 'Total users',
      value: kpis.totalUsers,
      icon: Users,
      onClick: () => onKpiClick?.({}),
    },
    {
      title: 'Active',
      value: kpis.activeUsers,
      icon: UserCheck,
      color: 'text-[rgb(16,185,129)]',
      onClick: () => onKpiClick?.({ status: 'active' }),
    },
    {
      title: 'Suspended',
      value: kpis.suspendedUsers,
      icon: UserX,
      color: 'text-[rgb(239,68,68)]',
      onClick: () => onKpiClick?.({ status: 'suspended' }),
    },
    {
      title: 'Pending invites',
      value: kpis.pendingInvites,
      icon: Mail,
      color: 'text-[rgb(245,158,66)]',
    },
  ]

  if (isLoading) {
    return (
      <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
        {cards.map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    )
  }

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {cards.map((card) => (
        <Card
          key={card.title}
          className={cn(
            'card-hover cursor-pointer transition-all duration-200',
            card.onClick && 'hover:shadow-card-hover'
          )}
          onClick={card.onClick}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className={cn('h-4 w-4 text-muted-foreground', card.color)} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
