import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Link2,
  Eye,
  MessageSquare,
  Check,
  Download,
  Ban,
  ChevronLeft,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  getProject,
  getProjectClientLinks,
  revokeClientLink,
  getClientLinkAnalytics,
  type ClientLinkItem,
} from '@/api/projects'
import { toast } from 'sonner'
import { useState } from 'react'
import { cn } from '@/lib/utils'

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export function ClientLinksPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const queryClient = useQueryClient()
  const [analyticsLink, setAnalyticsLink] = useState<ClientLinkItem | null>(null)

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId!),
    enabled: !!projectId,
  })

  const { data: linksData, isLoading } = useQuery({
    queryKey: ['project-client-links', projectId],
    queryFn: () => getProjectClientLinks(projectId!),
    enabled: !!projectId,
  })

  const revokeMutation = useMutation({
    mutationFn: (tokenId: string) => revokeClientLink(projectId!, tokenId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-client-links', projectId] })
      toast.success('Link revoked')
    },
    onError: (e: { message?: string }) => {
      toast.error(e?.message ?? 'Failed to revoke link')
    },
  })

  const links = linksData?.items ?? []

  return (
    <div className="space-y-8 animate-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <nav className="text-sm text-muted-foreground">
            <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
            <span className="mx-2">/</span>
            <Link to="/dashboard/projects" className="hover:text-foreground">Projects</Link>
            <span className="mx-2">/</span>
            <Link to={`/dashboard/projects/${projectId}`} className="hover:text-foreground">
              {project?.name ?? 'Project'}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">Client links</span>
          </nav>
          <h1 className="mt-2 text-2xl font-bold">Client links & analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage shareable client links, view usage analytics, and revoke access when needed.
          </p>
        </div>
        <Link to={`/dashboard/projects/${projectId}`}>
          <Button variant="outline" size="sm">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to project
          </Button>
        </Link>
      </div>

      <Card className="border-[rgb(229,231,235)] bg-[#FFFFFF] shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Link2 className="h-5 w-5 text-[rgb(107,114,128)]" />
            Share links
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Links are created when you share a decision with a client. Each link is time-limited and can be revoked.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : links.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[rgb(229,231,235)] bg-[rgb(247,247,249)] py-16 text-center">
              <Link2 className="h-12 w-12 text-[rgb(107,114,128)]" aria-hidden />
              <p className="mt-4 font-medium text-[rgb(17,24,39)]">No client links yet</p>
              <p className="mt-1 text-sm text-[rgb(107,114,128)]">
                Share a decision with a client to generate a secure, no-login link.
              </p>
              <Link to={`/dashboard/projects/${projectId}/decisions/new`} className="mt-4">
                <Button size="sm">
                  Create decision
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {links.map((link) => (
                <ClientLinkRow
                  key={link.id}
                  link={link}
                  onRevoke={() => revokeMutation.mutate(link.id)}
                  onViewAnalytics={() => setAnalyticsLink(link)}
                  isRevoking={revokeMutation.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {analyticsLink && (
        <AnalyticsDialog
          projectId={projectId!}
          link={analyticsLink}
          open={!!analyticsLink}
          onClose={() => setAnalyticsLink(null)}
        />
      )}
    </div>
  )
}

interface ClientLinkRowProps {
  link: ClientLinkItem
  onRevoke: () => void
  onViewAnalytics: () => void
  isRevoking: boolean
}

function ClientLinkRow({ link, onRevoke, onViewAnalytics, isRevoking }: ClientLinkRowProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-xl border p-4 transition-all sm:flex-row sm:items-center sm:justify-between',
        'border-[rgb(229,231,235)] bg-[#FFFFFF] hover:border-[rgb(209,213,219)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]',
        link.revoked && 'opacity-60'
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-[rgb(17,24,39)]">
            {link.decisionTitles[0] ?? 'Decision'}
          </span>
          {link.revoked ? (
            <Badge variant="destructive" className="shrink-0">Revoked</Badge>
          ) : (
            <Badge variant="secondary" className="shrink-0">Active</Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-[rgb(107,114,128)]">
          Expires {formatDate(link.expiresAt)}
          {link.lastUsedAt && ` · Last used ${formatDate(link.lastUsedAt)}`}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onViewAnalytics}
          aria-label="View analytics"
        >
          <BarChart3 className="mr-2 h-4 w-4" />
          Analytics
        </Button>
        {!link.revoked && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onRevoke}
            disabled={isRevoking}
            aria-label="Revoke link"
          >
            <Ban className="mr-2 h-4 w-4" />
            Revoke
          </Button>
        )}
      </div>
    </div>
  )
}

interface AnalyticsDialogProps {
  projectId: string
  link: ClientLinkItem
  open: boolean
  onClose: () => void
}

function AnalyticsDialog({ projectId, link, open, onClose }: AnalyticsDialogProps) {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['client-link-analytics', projectId, link.id],
    queryFn: () => getClientLinkAnalytics(projectId, link.id),
    enabled: open && !!projectId && !!link.id,
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md border-[rgb(229,231,235)] bg-[#FFFFFF]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[rgb(0,82,204)]" />
            Link analytics
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {link.decisionTitles[0] ?? 'Decision'}
          </p>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : analytics ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <MetricCard icon={Eye} label="Views" value={analytics.views} />
                <MetricCard icon={MessageSquare} label="Comments" value={analytics.comments} />
                <MetricCard icon={Check} label="Approvals" value={analytics.approvals} />
                <MetricCard icon={Download} label="Exports" value={analytics.exports} />
              </div>
              {analytics.lastSeenAt && (
                <p className="text-xs text-muted-foreground">
                  Last activity: {formatDate(analytics.lastSeenAt)}
                </p>
              )}
              {analytics.events.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium">Recent events</p>
                  <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                    {analytics.events.slice(0, 10).map((e, i) => (
                      <li key={i}>
                        {e.eventType} · {formatDate(e.timestamp)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No analytics data yet.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[rgb(229,231,235)] bg-[rgb(247,247,249)] p-3">
      <Icon className="h-5 w-5 text-[rgb(107,114,128)]" aria-hidden />
      <div>
        <p className="text-2xl font-semibold text-[rgb(17,24,39)]">{value}</p>
        <p className="text-xs text-[rgb(107,114,128)]">{label}</p>
      </div>
    </div>
  )
}
