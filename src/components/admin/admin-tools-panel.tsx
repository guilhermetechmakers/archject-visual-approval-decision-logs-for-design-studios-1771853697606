import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { adminApi } from '@/api/admin'
import { FileText, Shield } from 'lucide-react'

export function AdminToolsPanel() {
  const queryClient = useQueryClient()
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false)

  const maintenanceMutation = useMutation({
    mutationFn: () => adminApi.toggleMaintenanceMode(),
    onSuccess: (data: { enabled: boolean }) => {
      setMaintenanceEnabled(data.enabled)
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      toast.success(data.enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled')
    },
    onError: () => toast.error('Failed to toggle maintenance mode'),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Tools</CardTitle>
        <p className="text-sm text-muted-foreground">Bulk actions and system controls</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/users">
            <Button variant="outline" size="sm">
              <Shield className="mr-2 h-4 w-4" />
              Suspend / Reactivate users
            </Button>
          </Link>
          <Link to="/admin/analytics">
            <Button variant="outline" size="sm">
              <FileText className="mr-2 h-4 w-4" />
              Audit log
            </Button>
          </Link>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="font-medium">Maintenance mode</p>
            <p className="text-sm text-muted-foreground">Disable platform access for non-admins</p>
          </div>
          <Button
            variant={maintenanceEnabled ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => maintenanceMutation.mutate()}
            disabled={maintenanceMutation.isPending}
          >
            {maintenanceEnabled ? 'Disable' : 'Enable'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
