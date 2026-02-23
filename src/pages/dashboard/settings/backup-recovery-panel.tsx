import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { HardDrive, Download, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { getBackups, updateBackupSchedule, triggerBackupExport } from '@/api/settings'
import { toast } from 'sonner'

export function BackupRecoveryPanel() {
  const queryClient = useQueryClient()
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'pdf'>('json')

  const { data: backups, isLoading } = useQuery({
    queryKey: ['settings', 'backups', 'default'],
    queryFn: () => getBackups('default'),
  })

  const scheduleMutation = useMutation({
    mutationFn: (schedule: 'daily' | 'weekly') =>
      updateBackupSchedule('default', schedule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'backups', 'default'] })
      toast.success('Backup schedule updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const exportMutation = useMutation({
    mutationFn: (format: 'json' | 'csv' | 'pdf') =>
      triggerBackupExport('default', format),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'backups', 'default'] })
      toast.success(`Export started. Status: ${data.status}`)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (isLoading || !backups) {
    return (
      <Card className="card-hover">
        <CardHeader>
          <CardTitle>Backup & Recovery</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-48 animate-pulse rounded-xl bg-muted" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-muted-foreground" />
            Backup & Recovery
          </CardTitle>
          <CardDescription>
            Schedule backups and export your studio data on demand
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="backup-schedule">Backup schedule</Label>
            <Select
              id="backup-schedule"
              options={[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
              ]}
              value={backups.schedule}
              onValueChange={(v) =>
                scheduleMutation.mutate(v as 'daily' | 'weekly')
              }
              placeholder="Select schedule"
            />
          </div>

          <dl className="grid gap-2 rounded-lg border border-border p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Last backup</dt>
              <dd className="font-medium">
                {backups.lastBackupAt
                  ? new Date(backups.lastBackupAt).toLocaleString()
                  : 'Never'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Retention</dt>
              <dd className="font-medium">{backups.retentionPeriod} days</dd>
            </div>
          </dl>

          <div className="space-y-2">
            <Label>On-demand export</Label>
            <p className="text-sm text-muted-foreground">
              Export your studio data as JSON, CSV, or PDF. Exports are typically ready within a few minutes.
            </p>
            <div className="flex flex-wrap gap-3">
              <Select
                options={[
                  { value: 'json', label: 'JSON' },
                  { value: 'csv', label: 'CSV' },
                  { value: 'pdf', label: 'PDF' },
                ]}
                value={exportFormat}
                onValueChange={(v) => setExportFormat(v as 'json' | 'csv' | 'pdf')}
              />
              <Button
                onClick={() => exportMutation.mutate(exportFormat)}
                disabled={exportMutation.isPending}
                className="gap-2"
              >
                {exportMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Trigger export
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
