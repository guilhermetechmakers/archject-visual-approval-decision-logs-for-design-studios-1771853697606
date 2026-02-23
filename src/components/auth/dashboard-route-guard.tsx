import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'

interface DashboardRouteGuardProps {
  children: React.ReactNode
}

export function DashboardRouteGuard({ children }: DashboardRouteGuardProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent"
            aria-hidden
          />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/auth?tab=login"
        state={{ from: location }}
        replace
      />
    )
  }

  return <>{children}</>
}
