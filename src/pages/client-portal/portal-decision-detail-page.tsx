import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ApprovalBar,
  CommentThread,
  ActivityTimeline,
  AttachmentsView,
  ShareExportPanel,
  FollowUpTaskCreator,
} from '@/components/client-portal'
import {
  getClientDecisionDetail,
  getClientComments,
  getClientDecisionHistory,
  postClientComment,
  postClientApprove,
  postClientExport,
  postClientFollowUp,
} from '@/api/client-portal'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function PortalDecisionDetailPage() {
  const { token, decisionId } = useParams<{ token: string; decisionId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: decision, isLoading, error } = useQuery({
    queryKey: ['client-decision-detail', token, decisionId],
    queryFn: () => getClientDecisionDetail(token!, decisionId!),
    enabled: !!token && !!decisionId,
  })

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['client-comments', token, decisionId],
    queryFn: () => getClientComments(token!, decisionId!),
    enabled: !!token && !!decisionId,
  })

  const { data: historyData } = useQuery({
    queryKey: ['client-decision-history', token, decisionId],
    queryFn: () => getClientDecisionHistory(token!, decisionId!),
    enabled: !!token && !!decisionId,
  })
  const auditEntries = (historyData?.items ?? []).map((item) => ({
    id: item.id,
    decisionId: item.decisionId,
    action: item.action,
    actor: item.actor,
    timestamp: item.timestamp,
    details: item.details,
  }))

  const approveMutation = useMutation({
    mutationFn: (optionId: string) =>
      postClientApprove(token!, decisionId!, {
        optionId,
        exportOptions: { types: ['pdf'] },
      }),
    onSuccess: (_data, optionId) => {
      queryClient.invalidateQueries({ queryKey: ['client-decision-detail', token, decisionId] })
      queryClient.invalidateQueries({ queryKey: ['client-decisions', token] })
      const approvedOption = decision?.options.find((o) => o.id === optionId)
      navigate(`/client/${token}/confirmation`, {
        replace: true,
        state: { approvedOption },
      })
      toast.success('Approval recorded')
    },
    onError: (err: unknown) => {
      toast.error((err as { message?: string })?.message ?? 'Approval failed')
    },
  })

  const handleApprove = (optionId: string, _approverName?: string) => {
    approveMutation.mutate(optionId)
  }

  const handleAddComment = async (content: string, parentCommentId?: string) => {
    await postClientComment(token!, decisionId!, { content, parentCommentId })
    refetchComments()
    toast.success('Comment added')
  }

  const handleExport = async (_format?: 'pdf' | 'csv') => {
    await postClientExport(token!, decisionId!)
    toast.success('Export started')
  }

  const handleFollowUp = async (title: string, description?: string) => {
    await postClientFollowUp(token!, decisionId!, { title, description })
    toast.success('Follow-up task created')
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-1/3 rounded bg-muted animate-pulse" />
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-48 rounded-xl bg-muted animate-pulse" />
          <div className="h-48 rounded-xl bg-muted animate-pulse" />
        </div>
      </div>
    )
  }

  if (error || !decision) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
        <p className="text-destructive">
          {(error as { message?: string })?.message ?? 'Decision not found'}
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate(`/client/${token}`)}
        >
          Back to decisions
        </Button>
      </div>
    )
  }

  const lastConfirmedAt = (decision as { lastConfirmedAt?: string }).lastConfirmedAt
  const lastConfirmedBy = (decision as { lastConfirmedBy?: string }).lastConfirmedBy
  let approvedByName: string | undefined
  if (typeof lastConfirmedBy === 'string') {
    try {
      const parsed = JSON.parse(lastConfirmedBy) as { clientName?: string; userId?: string }
      approvedByName = parsed.clientName ?? parsed.userId
    } catch {
      approvedByName = lastConfirmedBy
    }
  }

  const status = decision.status
  const isApproved = status === 'approved'

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/client/${token}`)}
          className="w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to decisions
        </Button>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{decision.title}</h1>
          <Badge
            variant={
              isApproved ? 'success' : status === 'pending' ? 'warning' : 'secondary'
            }
          >
            {status}
          </Badge>
        </div>
        {decision.description && (
          <p className="mt-2 text-muted-foreground">{decision.description}</p>
        )}
      </div>

      {/* Side-by-side options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {decision.options.map((opt) => (
              <div
                key={opt.id}
                className={cn(
                  'rounded-xl border-2 p-4 transition-all',
                  opt.id === (decision as { approvedOptionId?: string }).approvedOptionId
                    ? 'border-success bg-success/5'
                    : 'border-border'
                )}
              >
                <div className="aspect-video overflow-hidden rounded-lg bg-muted">
                  {opt.imageUrl ?? (opt as { mediaUrl?: string }).mediaUrl ? (
                    <img
                      src={opt.imageUrl ?? (opt as { mediaUrl?: string }).mediaUrl}
                      alt={opt.label}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      —
                    </div>
                  )}
                </div>
                <h3 className="mt-3 font-semibold">{opt.label}</h3>
                {opt.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{opt.description}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Approval bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Approve</CardTitle>
          <p className="text-sm text-muted-foreground">
            Select your preferred option and confirm your approval.
          </p>
        </CardHeader>
        <CardContent>
          <ApprovalBar
            decision={{
              ...decision,
              approvedOptionId: (decision as { approvedOptionId?: string }).approvedOptionId,
              approvedAt: lastConfirmedAt,
              approvedByName,
            }}
            onApprove={handleApprove}
            isLoading={approveMutation.isPending}
          />
        </CardContent>
      </Card>

      {/* Actions: Share, Export, Follow-up */}
      <div className="flex flex-wrap items-center gap-4">
        <ShareExportPanel
          onShare={() => {
            const url = token ? `${window.location.origin}/client/${token}/decision/${decisionId}` : ''
            if (navigator.share) {
              navigator.share({ title: decision.title, url })
            } else {
              navigator.clipboard.writeText(url)
              toast.success('Link copied')
            }
          }}
          onExport={handleExport}
        />
        <FollowUpTaskCreator onCreate={handleFollowUp} disabled={!token} />
      </div>

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Discussion</CardTitle>
        </CardHeader>
        <CardContent>
          <CommentThread
            comments={comments}
            onPostComment={handleAddComment}
            isLoading={false}
          />
        </CardContent>
      </Card>

      {/* Activity timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTimeline
            entries={auditEntries}
            decisionCreatedAt={decision.createdAt}
            decisionApprovedAt={lastConfirmedAt}
            approvedByName={approvedByName}
          />
        </CardContent>
      </Card>

      {decision.attachments && decision.attachments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Attachments</CardTitle>
          </CardHeader>
          <CardContent>
            <AttachmentsView attachments={decision.attachments} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
