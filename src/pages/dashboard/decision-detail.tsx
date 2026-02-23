import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Share2, Download, Check, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadingOverlay } from '@/components/loading-overlay'
import { createJob } from '@/api/jobs'
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
  const [exportJobId, setExportJobId] = useState<string | null>(null)
  const [exportOverlayOpen, setExportOverlayOpen] = useState(false)

  const handleExport = async () => {
    if (!decisionId || !projectId) return
    try {
      const { jobId } = await createJob({
        type: 'EXPORT_PDF',
        projectId,
        payload: { decisionIds: [decisionId], includeSigned: true },
      })
      setExportJobId(jobId)
      setExportOverlayOpen(true)
    } catch {
      toast.error('Failed to start export')
    }
  }

  const handleRetryExport = async () => {
    setExportJobId(null)
    setExportOverlayOpen(false)
    await handleExport()
  }

  const { data: decision = mockDecision, isLoading } = useQuery({
    queryKey: ['decision', decisionId],
    queryFn: () => api.get<Decision>(`/decisions/${decisionId}`).catch(() => mockDecision),
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="mr-2 h-4 w-4" />
            Share link
          </Button>
          <Button size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Visual comparison hero */}
      <Card>
        <CardHeader>
          <CardTitle>Options</CardTitle>
          {decision.description && (
            <p className="text-muted-foreground">{decision.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {decision.options.map((opt) => (
              <div
                key={opt.id}
                className={`relative overflow-hidden rounded-lg border-2 p-4 transition-all ${
                  opt.selected || decision.approvedOptionId === opt.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {opt.selected || decision.approvedOptionId === opt.id ? (
                  <div className="absolute right-2 top-2 rounded-full bg-primary p-1">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                ) : null}
                <div className="aspect-video rounded-md bg-muted flex items-center justify-center">
                  {opt.imageUrl ? (
                    <img src={opt.imageUrl} alt={opt.label} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-muted-foreground text-sm">No image</span>
                  )}
                </div>
                <h4 className="mt-2 font-medium">{opt.label}</h4>
                {opt.description && (
                  <p className="text-sm text-muted-foreground">{opt.description}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comments & Audit */}
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
            </div>
          </CardContent>
        </Card>
      </div>

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
