import { useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Share2, Download, Check, MessageSquare, Paperclip, ListTodo } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadingOverlay } from '@/components/loading-overlay'
import { createExport, getDecisionAudit } from '@/api/exports-decision-logs'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import type { Decision } from '@/types'

const mockDecision: Decision = {
  id: '1',
  projectId: '1',
  title: 'Kitchen counter material',
  description: 'Please select your preferred counter material for the kitchen island.',
  options: [
    { id: 'opt1', label: 'Quartz - Calacatta', imageUrl: '', description: 'White with subtle veining' },
    { id: 'opt2', label: 'Granite - Black Galaxy', imageUrl: '', description: 'Dark with gold flecks' },
    { id: 'opt3', label: 'Marble - Carrara', imageUrl: '', description: 'Classic white marble' },
  ],
  status: 'pending',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export function DecisionDetail() {
  const { projectId, decisionId } = useParams<{ projectId: string; decisionId: string }>()
  const navigate = useNavigate()
  const [exportJobId, setExportJobId] = useState<string | null>(null)
  const [exportOverlayOpen, setExportOverlayOpen] = useState(false)

  const handleExport = useCallback(async () => {
    if (!decisionId || !projectId) return
    try {
      const { jobId } = await createExport({
        projectId,
        decisionIds: [decisionId],
        format: 'PDF',
        includeAttachments: true,
      })
      setExportJobId(jobId)
      setExportOverlayOpen(true)
    } catch {
      toast.error('Failed to start export')
    }
  }, [decisionId, projectId])

  const handleRetryExport = useCallback(() => {
    setExportJobId(null)
    setExportOverlayOpen(false)
    handleExport()
  }, [handleExport])

  const handleCreateFollowUp = useCallback(() => {
    toast.info('Create follow-up task — coming soon')
  }, [])

  const { data: decision = mockDecision, isLoading } = useQuery({
    queryKey: ['decision', projectId, decisionId],
    queryFn: () =>
      api
        .get<Decision>(`/projects/${projectId}/decisions/${decisionId}`)
        .catch(() => mockDecision),
    enabled: !!projectId && !!decisionId,
  })

  const { data: auditEntries = [] } = useQuery({
    queryKey: ['decision-audit', decisionId],
    queryFn: () => getDecisionAudit(decisionId!),
    enabled: !!decisionId,
  })

  return (
    <div className="space-y-8 animate-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <nav className="text-sm text-muted-foreground">
            <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
            <span className="mx-2">/</span>
            <Link to={`/dashboard/projects/${projectId}`} className="hover:text-foreground">Project</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{decision.title}</span>
          </nav>
          {isLoading ? (
            <Skeleton className="mt-2 h-8 w-64" />
          ) : (
            <h1 className="mt-2 text-2xl font-bold">{decision.title}</h1>
          )}
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={decision.status === 'approved' ? 'success' : decision.status === 'pending' ? 'warning' : 'secondary'}>
              {decision.status}
            </Badge>
            {decision.approvedAt && (
              <span className="text-sm text-muted-foreground">
                Approved {new Date(decision.approvedAt).toLocaleDateString()}
                {decision.approvedByName && ` by ${decision.approvedByName}`}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" aria-label="Share decision link">
            <Share2 className="mr-2 h-4 w-4" />
            Share link
          </Button>
          <Button size="sm" onClick={handleExport} aria-label="Export decision log">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard/exports')}
            aria-label="View exports"
          >
            View exports
          </Button>
          <Button variant="outline" size="sm" onClick={handleCreateFollowUp} aria-label="Create follow-up task">
            <ListTodo className="mr-2 h-4 w-4" />
            Create follow-up task
          </Button>
        </div>
      </div>

      {/* Visual comparison panel - side-by-side options */}
      <Card>
        <CardHeader>
          <CardTitle>Options</CardTitle>
          {decision.description && (
            <p className="text-muted-foreground">{decision.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <div
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            role="grid"
            aria-label="Decision options comparison"
          >
            {decision.options.map((opt) => {
              const isSelected =
                opt.selected || decision.approvedOptionId === opt.id
              return (
                <div
                  key={opt.id}
                  role="gridcell"
                  className={`relative overflow-hidden rounded-xl border-2 p-4 transition-all duration-200 ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-card'
                      : 'border-border hover:border-primary/50 hover:shadow-sm'
                  }`}
                >
                  {isSelected && (
                    <div
                      className="absolute right-2 top-2 rounded-full bg-primary p-1.5"
                      aria-hidden
                    >
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                  <div className="aspect-video rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                    {opt.imageUrl ? (
                      <img
                        src={opt.imageUrl}
                        alt={opt.label}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-muted-foreground text-sm">No image</span>
                    )}
                  </div>
                  <h4 className="mt-3 font-semibold">{opt.label}</h4>
                  {opt.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {opt.description}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Comments, Audit & Attachments */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Comments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 font-medium">No comments yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add a comment to discuss with the client
              </p>
              <Button variant="outline" size="sm" className="mt-4">
                Add comment
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Audit log</CardTitle>
            <p className="text-sm text-muted-foreground">Decision history and timestamps</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {auditEntries.length > 0 ? (
                auditEntries.map((entry) => (
                  <div key={entry.id} className="flex gap-3">
                    <div
                      className={`h-2 w-2 shrink-0 rounded-full mt-2 ${
                        entry.action === 'approved' ? 'bg-success' : entry.action === 'created' ? 'bg-primary' : 'bg-muted-foreground'
                      }`}
                    />
                    <div>
                      <p className="text-sm capitalize">
                        {entry.action.replace(/_/g, ' ')}
                        {entry.performedBy && ` by ${entry.performedBy}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex gap-3">
                    <div className="h-2 w-2 shrink-0 rounded-full bg-primary mt-2" />
                    <div>
                      <p className="text-sm">Decision created</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(decision.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {decision.approvedAt && (
                    <div className="flex gap-3">
                      <div className="h-2 w-2 shrink-0 rounded-full bg-success mt-2" />
                      <div>
                        <p className="text-sm">Approved by {decision.approvedByName ?? 'Client'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(decision.approvedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attachments gallery */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Attachments
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Files and images attached to this decision
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Paperclip className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 font-medium">No attachments yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Attach drawings, specs, or reference images from the library
            </p>
            <Button variant="outline" size="sm" className="mt-4">
              Add attachment
            </Button>
          </div>
        </CardContent>
      </Card>

      <LoadingOverlay
        jobId={exportJobId}
        operationName="Generating approval pack"
        subtitle={
          decisionId
            ? `Compiling Decision Log for Project — ${decision.title}`
            : undefined
        }
        open={exportOverlayOpen}
        onOpenChange={(open) => {
          setExportOverlayOpen(open)
          if (!open) setExportJobId(null)
        }}
        onRetry={handleRetryExport}
        exportsPagePath="/dashboard/exports"
        decisionDetailPath={
          projectId && decisionId
            ? `/dashboard/projects/${projectId}/decisions/${decisionId}`
            : undefined
        }
      />
    </div>
  )
}
