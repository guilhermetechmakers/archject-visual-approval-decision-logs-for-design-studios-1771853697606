import { Navigate, useLocation } from 'react-router-dom'
import { hasAdminToken } from '@/api/admin'

interface AdminRouteGuardProps {
  children: React.ReactNode
}

export function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const location = useLocation()

  if (!hasAdminToken()) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
