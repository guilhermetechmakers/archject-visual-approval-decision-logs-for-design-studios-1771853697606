import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ApprovalBar,
  CommentThread,
  AttachmentsView,
  ActivityTimeline,
  ShareExportPanel,
} from '@/components/client-portal'
import {
  getClientDecisionDetail,
  getClientComments,
  postClientComment,
  postClientApprove,
  postClientExport,
} from '@/api/client-portal'
import { toast } from 'sonner'
import type { PortalDecision, PortalComment } from '@/types/portal'

export function ClientPortalDecisionDetail() {
  const { token, decisionId } = useParams<{ token: string; decisionId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [exporting, setExporting] = useState(false)

  const { data: decision, isLoading } = useQuery({
    queryKey: ['client-decision', token, decisionId],
    queryFn: () => getClientDecisionDetail(token!, decisionId!),
    enabled: !!token && !!decisionId,
  })

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['client-comments', token, decisionId],
    queryFn: () => getClientComments(token!, decisionId!),
    enabled: !!token && !!decisionId,
  })

  const approveMutation = useMutation({
    mutationFn: (optionId: string) =>
      postClientApprove(token!, decisionId!, {
        optionId,
        exportOptions: { types: ['pdf'] },
      }),
    onSuccess: (_data, optionId) => {
      queryClient.invalidateQueries({ queryKey: ['client-decision', token, decisionId] })
      queryClient.invalidateQueries({ queryKey: ['client-decisions', token] })
      const approvedOption = decision?.options.find((o) => o.id === optionId)
      navigate(`/client/${token}/confirmation`, {
        replace: true,
        state: { approvedOption },
      })
    },
    onError: (err: { message?: string }) => {
      toast.error(err?.message ?? 'Approval failed')
    },
  })

  const commentMutation = useMutation({
    mutationFn: ({ content, parentId }: { content: string; parentId?: string }) =>
      postClientComment(token!, decisionId!, {
        content,
        parentCommentId: parentId,
      }),
    onSuccess: () => {
      refetchComments()
    },
    onError: (err: { message?: string }) => {
      toast.error(err?.message ?? 'Failed to post comment')
    },
  })

  const handleApprove = (optionId: string, _approverName?: string) => {
    approveMutation.mutate(optionId)
  }

  const handlePostComment = (content: string, parentCommentId?: string) => {
    commentMutation.mutate({ content, parentId: parentCommentId })
  }

  const handleExport = async () => {
    if (!token || !decisionId) return
    setExporting(true)
    try {
      const res = await postClientExport(token, decisionId)
      if (res?.url) {
        window.open(res.url, '_blank')
      }
      toast.success('Export started')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  const handleShare = () => {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({
        title: decision?.title ?? 'Decision',
        url,
      })
    } else {
      navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard')
    }
  }

  if (isLoading || !decision) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    )
  }

  const isApproved = decision.status === 'approved'
  const attachments: { id: string; filename: string; url: string; mimeType?: string; size?: number }[] = []

  return (
    <div className="space-y-6 animate-in-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/client/${token}`)}
            aria-label="Back to decisions"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-[rgb(17,24,39)]">
              {decision.title}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={isApproved ? 'success' : 'warning'}>
                {isApproved ? 'Approved' : 'Pending'}
              </Badge>
            </div>
          </div>
        </div>
        <ShareExportPanel
          onShare={handleShare}
          onExport={handleExport}
          isExporting={exporting}
        />
      </div>

      {/* Options comparison */}
      <Card className="border-[rgb(229,231,235)] bg-[#FFFFFF] shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Options</CardTitle>
          {decision.description && (
            <p className="text-sm text-[rgb(107,114,128)]">
              {decision.description}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(decision as PortalDecision).options.map((opt) => (
              <div
                key={opt.id}
                className={`relative overflow-hidden rounded-lg border-2 p-4 transition-all ${
                  opt.selected || decision.approvedOptionId === opt.id
                    ? 'border-[rgb(16,185,129)] bg-[rgb(16,185,129)]/5'
                    : 'border-[rgb(229,231,235)] hover:border-[rgb(0,82,204)]/50'
                }`}
              >
                {(opt.selected || decision.approvedOptionId === opt.id) && (
                  <div className="absolute right-2 top-2 rounded-full bg-[rgb(16,185,129)] p-1">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
                <div className="aspect-video rounded-md bg-[rgb(243,244,246)] flex items-center justify-center overflow-hidden">
                  {(opt as { imageUrl?: string; mediaUrl?: string }).imageUrl ||
                  (opt as { imageUrl?: string; mediaUrl?: string }).mediaUrl ? (
                    <img
                      src={
                        (opt as { imageUrl?: string }).imageUrl ??
                        (opt as { mediaUrl?: string }).mediaUrl
                      }
                      alt={opt.label}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm text-[rgb(107,114,128)]">
                      {opt.label}
                    </span>
                  )}
                </div>
                <h4 className="mt-2 font-medium text-[rgb(17,24,39)]">
                  {opt.label}
                </h4>
                {opt.description && (
                  <p className="mt-1 text-sm text-[rgb(107,114,128)]">
                    {opt.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Approval bar */}
      <Card className="border-[rgb(229,231,235)] bg-[#FFFFFF] shadow-card">
        <CardContent className="pt-6">
          <ApprovalBar
            decision={decision as PortalDecision}
            onApprove={handleApprove}
            isLoading={approveMutation.isPending}
          />
        </CardContent>
      </Card>

      {/* Comments and Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-[rgb(229,231,235)] bg-[#FFFFFF] shadow-card">
          <CardContent className="pt-6">
            <CommentThread
              comments={comments as PortalComment[]}
              onPostComment={handlePostComment}
              isLoading={commentMutation.isPending}
            />
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card className="border-[rgb(229,231,235)] bg-[#FFFFFF] shadow-card">
            <CardContent className="pt-6">
              <AttachmentsView attachments={attachments} />
            </CardContent>
          </Card>
          <Card className="border-[rgb(229,231,235)] bg-[#FFFFFF] shadow-card">
            <CardContent className="pt-6">
              <ActivityTimeline
                entries={[]}
                decisionCreatedAt={decision.createdAt}
                decisionApprovedAt={decision.approvedAt ?? decision.lastConfirmedAt}
                approvedByName={decision.approvedByName}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
