import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Ticket, MessageSquare } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { adminApi } from '@/api/admin'
import { Skeleton } from '@/components/ui/skeleton'
const priorityColors: Record<string, 'destructive' | 'warning' | 'default'> = {
  urgent: 'destructive',
  high: 'destructive',
  medium: 'warning',
  low: 'default',
}

const statusColors: Record<string, 'success' | 'warning' | 'secondary'> = {
  resolved: 'success',
  closed: 'success',
  pending: 'warning',
  open: 'secondary',
}

export function SupportTicketsTable() {
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [priorityFilter, setPriorityFilter] = useState<string>('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'tickets', { status: statusFilter, priority: priorityFilter }],
    queryFn: () => adminApi.getTickets({ status: statusFilter || undefined, priority: priorityFilter || undefined, perPage: 10 }),
  })

  const tickets = data?.tickets ?? []

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Support Tickets</CardTitle>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
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
            className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <Link to="/admin/tickets">
            <Button variant="outline" size="sm">
              View all
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Ticket className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 font-medium">No support tickets</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tickets will appear here when users submit support requests
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.slice(0, 8).map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.id.slice(0, 8)}...</TableCell>
                    <TableCell className="max-w-[200px] truncate">{t.subject}</TableCell>
                    <TableCell>
                      <Badge variant={priorityColors[t.priority] ?? 'default'}>{t.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[t.status] ?? 'secondary'}>{t.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(t.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Link to={`/admin/tickets?open=${t.id}`}>
                        <Button variant="ghost" size="icon" aria-label="Open ticket">
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
