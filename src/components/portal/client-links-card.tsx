import { useState } from 'react'
import {
  Share2,
  Link2,
  Eye,
  MessageSquare,
  Check,
  Download,
  Ban,
  Copy,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProjectClientLinks,
  generatePortalToken,
  revokePortalLink,
  type PortalLink,
  type PortalTokenGenerateResponse,
} from '@/api/portal'
import { getDecisions } from '@/api/decisions'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

function formatDate(s: string | null): string {
  if (!s) return '—'
  const d = new Date(s)
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  })
}

function formatRelative(s: string | null): string {
  if (!s) return 'Never'
  const d = new Date(s)
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 60_000) return 'Just now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return formatDate(s)
}

export interface ClientLinksCardProps {
  projectId: string
  decisions?: { id: string; title: string }[]
  className?: string
}

export function ClientLinksCard({
  projectId,
  decisions: decisionsProp,
  className,
}: ClientLinksCardProps) {
  const [generateOpen, setGenerateOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [selectedDecisionIds, setSelectedDecisionIds] = useState<string[]>([])
  const [expiresInDays, setExpiresInDays] = useState(7)

  const queryClient = useQueryClient()

  const { data: linksData, isLoading } = useQuery({
    queryKey: ['portal-links', projectId],
    queryFn: () => getProjectClientLinks(projectId),
    enabled: !!projectId,
  })

  const { data: decisionsData } = useQuery({
    queryKey: ['decisions', projectId],
    queryFn: () => getDecisions(projectId),
    enabled: !!projectId && generateOpen,
  })

  const decisions = decisionsProp ?? decisionsData ?? []
  const links = linksData?.links ?? []
  const displayLinks = expanded ? links : links.slice(0, 3)
  const hasMore = links.length > 3

  const generateMutation = useMutation({
    mutationFn: (body: {
      project_id: string
      decision_ids: string[]
      expires_in_minutes?: number
    }) =>
      generatePortalToken({
        ...body,
        allowed_actions: ['view', 'comment', 'approve', 'export'],
      }),
    onSuccess: (data: PortalTokenGenerateResponse) => {
      queryClient.invalidateQueries({ queryKey: ['portal-links', projectId] })
      setGenerateOpen(false)
      setSelectedDecisionIds([])
      navigator.clipboard
        ?.writeText(data.clientLink)
        .then(
          () => toast.success('Link copied to clipboard'),
          () => toast.info('Link created. Copy it from the dialog.')
        )
    },
    onError: (e: { message?: string }) => {
      toast.error(e?.message ?? 'Failed to generate link')
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (tokenId: string) => revokePortalLink(tokenId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-links', projectId] })
      toast.success('Link revoked')
    },
    onError: (e: { message?: string }) => {
      toast.error(e?.message ?? 'Failed to revoke link')
    },
  })

  const handleGenerate = () => {
    if (selectedDecisionIds.length === 0) {
      toast.error('Select at least one decision')
      return
    }
    generateMutation.mutate({
      project_id: projectId,
      decision_ids: selectedDecisionIds,
      expires_in_minutes: expiresInDays * 24 * 60,
    })
  }

  const toggleDecision = (id: string) => {
    setSelectedDecisionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  return (
    <>
      <Card className={cn('', className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4" aria-hidden />
            Client links
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setGenerateOpen(true)}
            aria-label="Generate new client link"
          >
            <Share2 className="mr-2 h-4 w-4" />
            New link
          </Button>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Share tokenized links with clients for approval. No login required.
          </p>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
            </div>
          ) : links.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[rgb(229,231,235)] bg-[#F7F7F9]/50 p-4 text-center">
              <p className="text-sm text-[rgb(107,114,128)]">No client links yet</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setGenerateOpen(true)}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Generate link
              </Button>
            </div>
          ) : (
            <ul className="space-y-3" role="list" aria-label="Client links">
              {displayLinks.map((link) => (
                <LinkRow
                  key={link.token_id}
                  link={link}
                  decisions={decisions}
                  onRevoke={() => revokeMutation.mutate(link.token_id)}
                  isRevoking={revokeMutation.isPending}
                />
              ))}
            </ul>
          )}
          {hasMore && !expanded && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full text-muted-foreground"
              onClick={() => setExpanded(true)}
            >
              <ChevronDown className="mr-2 h-4 w-4" />
              Show {links.length - 3} more
            </Button>
          )}
          {hasMore && expanded && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full text-muted-foreground"
              onClick={() => setExpanded(false)}
            >
              <ChevronUp className="mr-2 h-4 w-4" />
              Show less
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate client link</DialogTitle>
            <DialogDescription>
              Generate a time-limited link for clients to review and approve decisions.
              The link will be copied to your clipboard.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="text-sm font-medium">Decisions to include</Label>
              {decisions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No decisions yet. Create a decision first.
                </p>
              ) : (
                <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-[rgb(229,231,235)] p-2">
                  {decisions.map((d) => (
                    <label
                      key={d.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-[rgb(243,244,246)]"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDecisionIds.includes(d.id)}
                        onChange={() => toggleDecision(d.id)}
                        className="h-4 w-4 rounded border-[rgb(209,213,219)]"
                        aria-label={`Include ${d.title}`}
                      />
                      <span className="text-sm truncate">{d.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expires-days" className="text-sm font-medium">
                Expires in
              </Label>
              <select
                id="expires-days"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
                className="rounded-lg border border-[rgb(209,213,219)] bg-white px-3 py-2 text-sm"
              >
                <option value={1}>1 day</option>
                <option value={3}>3 days</option>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={
                generateMutation.isPending ||
                selectedDecisionIds.length === 0 ||
                decisions.length === 0
              }
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Generate & copy link
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function LinkRow({
  link,
  decisions,
  onRevoke,
  isRevoking,
}: {
  link: PortalLink
  decisions: { id: string; title: string }[]
  onRevoke: () => void
  isRevoking: boolean
}) {
  const decisionTitles = link.decision_ids
    .map((id) => decisions.find((d) => d.id === id)?.title ?? id.slice(0, 8))
    .join(', ')
  const isExpired = new Date(link.expires_at).getTime() < Date.now()

  return (
    <li
      className={cn(
        'rounded-lg border border-[rgb(229,231,235)] bg-[#FFFFFF] p-3 transition-shadow hover:shadow-sm',
        link.revoked && 'opacity-60'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[rgb(17,24,39)]" title={decisionTitles}>
            {decisionTitles || '—'}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[rgb(107,114,128)]">
            <span title="Views">
              <Eye className="mr-0.5 inline h-3 w-3" aria-hidden />
              {link.usage_stats.views}
            </span>
            <span title="Comments">
              <MessageSquare className="mr-0.5 inline h-3 w-3" aria-hidden />
              {link.usage_stats.comments}
            </span>
            <span title="Approvals">
              <Check className="mr-0.5 inline h-3 w-3" aria-hidden />
              {link.usage_stats.approvals}
            </span>
            <span title="Exports">
              <Download className="mr-0.5 inline h-3 w-3" aria-hidden />
              {link.usage_stats.exports}
            </span>
          </div>
          <p className="mt-1 text-xs text-[rgb(107,114,128)]">
            Last used {formatRelative(link.last_used_at)} · Expires {formatDate(link.expires_at)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {link.revoked ? (
            <Badge variant="secondary" className="text-xs">
              Revoked
            </Badge>
          ) : isExpired ? (
            <Badge variant="secondary" className="text-xs">
              Expired
            </Badge>
          ) : (
            <Badge variant="success">Active</Badge>
          )}
          {!link.revoked && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Link actions">
                  <span className="sr-only">Actions</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={onRevoke}
                  disabled={isRevoking}
                  className="text-destructive focus:text-destructive"
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Revoke link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </li>
  )
}
