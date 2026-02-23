import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { adminApi } from '@/api/admin'
import { MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Ticket {
  id: string
  projectId: string | null
  subject: string
  status: string
  priority: string
  assignedAdminId: string | null
  createdAt: string
  updatedAt: string
}

const priorityColors: Record<string, string> = {
  urgent: 'destructive',
  high: 'warning',
  medium: 'default',
  low: 'secondary',
}

const statusColors: Record<string, string> = {
  open: 'default',
  pending: 'warning',
  resolved: 'success',
  closed: 'secondary',
}

export function AdminTicketsPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const openTicketId = searchParams.get('open')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [replyBody, setReplyBody] = useState('')
  const [internalNote, setInternalNote] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'tickets', page, statusFilter, priorityFilter],
    queryFn: () =>
      adminApi.getTickets({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        page,
        perPage: 20,
      }),
  })

  const { data: ticketDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin', 'ticket', openTicketId],
    queryFn: () => adminApi.getTicket(openTicketId!),
    enabled: !!openTicketId,
  })

  const replyMutation = useMutation({
    mutationFn: ({ id, body, internalNote }: { id: string; body: string; internalNote: boolean }) =>
      adminApi.replyTicket(id, body, internalNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ticket', openTicketId] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'tickets'] })
      setReplyBody('')
      setInternalNote(false)
      toast.success('Reply added')
    },
    onError: () => toast.error('Failed to add reply'),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.updateTicket(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tickets'] })
      toast.success('Status updated')
    },
  })

  const tickets = data?.tickets ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 20) || 1

  return (
    <div className="space-y-8 animate-in">
      <div>
        <h1 className="text-2xl font-bold">Support Tickets</h1>
        <p className="mt-1 text-muted-foreground">
          Triage, assign, and respond to support requests
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Tickets</CardTitle>
          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 font-medium">No support tickets</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                      {tickets.map((t: Ticket) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.id.slice(0, 8)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{t.subject}</TableCell>
                      <TableCell>
                        <Badge variant={priorityColors[t.priority] as 'destructive' | 'warning' | 'default' | 'secondary'}>
                          {t.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[t.status] as 'default' | 'warning' | 'success' | 'secondary'}>
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSearchParams({ open: t.id })}
                          aria-label="Open ticket"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!openTicketId} onOpenChange={(open) => !open && setSearchParams({})}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{ticketDetail?.subject ?? 'Ticket'}</DialogTitle>
            <DialogDescription>
              {ticketDetail && (
                <div className="flex gap-2 mt-2">
                  <Badge>{ticketDetail.priority}</Badge>
                  <Badge variant="secondary">{ticketDetail.status}</Badge>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : ticketDetail ? (
            <div className="space-y-4">
              <div className="space-y-2">
                {ticketDetail.messages?.map((m: { id: string; body: string; internal_note: number; created_at: string }) => (
                  <div
                    key={m.id}
                    className={cn(
                      'rounded-lg border p-3 text-sm',
                      m.internal_note ? 'border-warning/50 bg-warning/5' : 'border-border'
                    )}
                  >
                    <p>{m.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {m.internal_note ? 'Internal note' : 'Reply'} · {new Date(m.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Add reply</label>
                <textarea
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                  placeholder="Type your reply..."
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={internalNote}
                    onChange={(e) => setInternalNote(e.target.checked)}
                  />
                  Internal note (not visible to requester)
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    openTicketId &&
                    replyMutation.mutate({ id: openTicketId, body: replyBody, internalNote })
                  }
                  disabled={!replyBody.trim() || replyMutation.isPending}
                >
                  Send reply
                </Button>
                <select
                  value={ticketDetail.status}
                  onChange={(e) =>
                    statusMutation.mutate({ id: openTicketId!, status: e.target.value })
                  }
                  className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
                >
                  <option value="open">Open</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSearchParams({})}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
