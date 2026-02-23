import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Trash2, Database, ExternalLink, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useExportsList, useCreateExport, useBackups } from '@/hooks/use-privacy'
import { PrivacyExportModal, PrivacyDeletionModal } from '@/components/privacy'
import { cn } from '@/lib/utils'

function DownloadExportButton({ exportId }: { exportId: string }) {
  const [loading, setLoading] = useState(false)
  const handleDownload = async () => {
    setLoading(true)
    try {
      const apiBase = import.meta.env.VITE_API_URL ?? '/api'
      const blob = await fetch(`${apiBase.replace(/\/$/, '')}/v1/privacy/exports/${exportId}/download`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      }).then((r) => r.blob())
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `archject-export-${exportId}.txt`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }
  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="text-sm text-primary hover:underline disabled:opacity-50"
    >
      {loading ? 'Downloading...' : 'Download'}
    </button>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    requested: { label: 'Requested', className: 'bg-muted text-muted-foreground' },
    processing: { label: 'Processing', className: 'bg-warning/20 text-warning' },
    completed: { label: 'Ready', className: 'bg-success/20 text-success' },
    failed: { label: 'Error', className: 'bg-destructive/20 text-destructive' },
  }
  const { label, className } = config[status] ?? { label: status, className: 'bg-muted' }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', className)}>
      {label}
    </span>
  )
}

export function DataPage() {
  const [exportOpen, setExportOpen] = useState(false)
  const [deletionOpen, setDeletionOpen] = useState(false)
  const { data: exports, isLoading: exportsLoading } = useExportsList()
  const { data: backups } = useBackups()
  const createExport = useCreateExport()

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold">Data & Privacy</h1>
        <p className="mt-1 text-muted-foreground">
          Export your data, manage account deletion, and learn about backups.
        </p>
      </div>

      {/* Export your data */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export your data
          </CardTitle>
          <CardDescription>
            Request a full archive of your account. Includes projects, decisions, approvals, comments, and attachments in JSON, CSV, and PDF formats.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Exports are typically ready within 24 hours. You will receive an email when your archive is available. Download links expire after 72 hours.
          </p>
          <Button onClick={() => setExportOpen(true)} className="gap-2" disabled={createExport.isPending}>
            {createExport.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Requesting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Request Export
              </>
            )}
          </Button>

          {exportsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading export history...
            </div>
          ) : exports && exports.length > 0 ? (
            <div>
              <h3 className="text-sm font-medium mb-2">Recent exports</h3>
              <ul className="space-y-2">
                {exports.slice(0, 5).map((exp) => (
                  <li
                    key={exp.id}
                    className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <StatusBadge status={exp.status} />
                      <span className="text-sm text-muted-foreground">
                        {new Date(exp.requested_at).toLocaleDateString()}
                      </span>
                    </div>
                    {exp.status === 'completed' && (
                      <DownloadExportButton exportId={exp.id} />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No exports yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Delete your account */}
      <Card className="card-hover border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete your account
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data. This action cannot be undone after the 14-day hold window.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
              All projects, decisions, and approvals will be permanently deleted.
            </li>
            <li className="flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
              Client links will stop working.
            </li>
            <li className="flex gap-2">
              <CheckCircle className="h-4 w-4 shrink-0 text-success mt-0.5" />
              You can cancel within 14 days before deletion is finalized.
            </li>
          </ul>
          <Button
            variant="outline"
            className="border-destructive text-destructive hover:bg-destructive/10"
            onClick={() => setDeletionOpen(true)}
          >
            Start deletion process
          </Button>
        </CardContent>
      </Card>

      {/* Backup & Recovery */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Backup & Recovery
          </CardTitle>
          <CardDescription>
            We perform nightly encrypted backups of all data. Backups are retained for 90 days with geographic replication.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Cadence</dt>
              <dd className="font-medium">{backups?.cadence ?? 'Nightly'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Retention</dt>
              <dd className="font-medium">{backups?.retention_days ?? 90} days</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Encryption</dt>
              <dd className="font-medium">{backups?.encryption ?? 'AES-256'}</dd>
            </div>
          </dl>
          <Link
            to="/help/article/security"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            Security documentation
            <ExternalLink className="h-4 w-4" />
          </Link>
        </CardContent>
      </Card>

      <PrivacyExportModal open={exportOpen} onOpenChange={setExportOpen} />
      <PrivacyDeletionModal open={deletionOpen} onOpenChange={setDeletionOpen} />
    </div>
  )
}
