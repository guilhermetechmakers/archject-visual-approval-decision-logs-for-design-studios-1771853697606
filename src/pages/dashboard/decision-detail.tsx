import { useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Share2, Download, Check, MessageSquare, Paperclip, ListTodo, FileText, Link2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadingOverlay } from '@/components/loading-overlay'
import { FilePreviewPanel, AttachmentPicker } from '@/components/library'
import { createExport } from '@/api/exports-decision-logs'
import { getDecision, getDecisionHistory, getDecisionAttachments } from '@/api/decisions'
import { downloadLibraryFile, attachFileToDecision, removeAttachmentFromDecision } from '@/api/library'
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

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

function getFullFileUrl(path: string | undefined): string | undefined {
  if (!path) return undefined
  if (path.startsWith('http')) return path
  return API_BASE ? `${API_BASE}${path}` : path
}

export function DecisionDetail() {
  const { projectId, decisionId } = useParams<{ projectId: string; decisionId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [exportJobId, setExportJobId] = useState<string | null>(null)
  const [exportOverlayOpen, setExportOverlayOpen] = useState(false)
  const [attachPickerOpen, setAttachPickerOpen] = useState(false)
  const [previewAttachment, setPreviewAttachment] = useState<{
    id: string
    fileId: string
    filename: string
    filetype: string
    thumbnailUrl?: string
  } | null>(null)

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
      getDecision(projectId!, decisionId!).catch(() => mockDecision),
    enabled: !!projectId && !!decisionId,
  })

  const { data: historyData } = useQuery({
    queryKey: ['decision-history', projectId, decisionId],
    queryFn: () => getDecisionHistory(decisionId!),
    enabled: !!projectId && !!decisionId,
  })
  const { data: attachmentsData } = useQuery({
    queryKey: ['decision-attachments', projectId, decisionId],
    queryFn: () => getDecisionAttachments(projectId!, decisionId!),
    enabled: !!projectId && !!decisionId,
  })
  const attachments = attachmentsData?.attachments ?? []

  const attachMutation = useMutation({
    mutationFn: (fileId: string) =>
      attachFileToDecision(projectId!, fileId, decisionId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decision-attachments', projectId, decisionId] })
      toast.success('File attached')
      setAttachPickerOpen(false)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Attach failed'),
  })

  const removeMutation = useMutation({
    mutationFn: (attachmentId: string) =>
      removeAttachmentFromDecision(projectId!, decisionId!, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decision-attachments', projectId, decisionId] })
      toast.success('Attachment removed')
      setPreviewAttachment(null)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Remove failed'),
  })

  const handleAttachFromLibrary = useCallback(
    (fileId: string) => attachMutation.mutate(fileId),
    [attachMutation]
  )

  const auditEntries = (historyData?.entries ?? []).map((e) => ({
    id: e.id,
    action: e.action,
    performedBy: e.performedBy ?? null,
    timestamp: e.timestamp,
    details: e.details,
  }))

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
          <Button
            variant="outline"
            size="sm"
            aria-label="Share decision link"
            onClick={() => {
              const url = window.location.href
              navigator.clipboard?.writeText(url).then(
                () => toast.success('Link copied to clipboard'),
                () => toast.error('Failed to copy link')
              )
            }}
          >
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Attachments
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Files and images attached to this decision
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAttachPickerOpen(true)}
              aria-label="Attach from library"
            >
              <Link2 className="mr-2 h-4 w-4" />
              Attach from library
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {attachments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Paperclip className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 font-medium">No attachments yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Attach drawings, specs, or reference images from the library
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setAttachPickerOpen(true)}
              >
                <Link2 className="mr-2 h-4 w-4" />
                Attach from library
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-muted/30 p-3 transition-all duration-200 hover:border-primary/30 hover:shadow-sm"
                >
                  <button
                    type="button"
                    className="aspect-square flex items-center justify-center rounded bg-muted overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onClick={() =>
                      setPreviewAttachment({
                        id: att.id,
                        fileId: att.fileId,
                        filename: att.filename,
                        filetype: att.filetype,
                        thumbnailUrl: att.thumbnailUrl,
                      })
                    }
                    aria-label={`Preview ${att.filename}`}
                  >
                    {att.thumbnailUrl ? (
                      <img
                        src={getFullFileUrl(att.thumbnailUrl) ?? att.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <FileText className="h-10 w-10 text-muted-foreground" />
                    )}
                  </button>
                  <p className="mt-2 truncate text-sm font-medium" title={att.filename}>
                    {att.filename}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        projectId &&
                        downloadLibraryFile(projectId, att.fileId, att.filename).then(
                          () => toast.success('Download started'),
                          () => toast.error('Download failed')
                        )
                      }
                    >
                      Download
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeMutation.mutate(att.id)}
                      disabled={removeMutation.isPending}
                      aria-label={`Remove ${att.filename}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AttachmentPicker
        open={attachPickerOpen}
        onOpenChange={setAttachPickerOpen}
        projectId={projectId ?? ''}
        onSelect={(file) => handleAttachFromLibrary(file.id)}
        excludeFileIds={attachments.map((a) => a.fileId)}
        mode="attach"
      />

      {previewAttachment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="File preview"
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <FilePreviewPanel
              file={{
                id: previewAttachment.fileId,
                projectId: projectId ?? '',
                filename: previewAttachment.filename,
                filepath: '',
                filetype: previewAttachment.filetype,
                size: 0,
                uploadedAt: '',
                currentVersion: 1,
                isArchived: false,
                thumbnailUrl: getFullFileUrl(previewAttachment.thumbnailUrl) ?? previewAttachment.thumbnailUrl,
              }}
              projectId={projectId ?? ''}
              onClose={() => setPreviewAttachment(null)}
            />
          </div>
        </div>
      )}

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
