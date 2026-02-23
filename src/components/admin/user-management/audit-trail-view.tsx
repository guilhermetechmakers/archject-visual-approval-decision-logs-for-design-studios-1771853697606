import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, type SelectOption } from '@/components/ui/select'
import { ChevronDown, ChevronUp, Download } from 'lucide-react'
import { adminApi, type AdminActionEntry } from '@/api/admin'
import { cn } from '@/lib/utils'

const actionTypeOptions: SelectOption[] = [
  { value: '', label: 'All actions' },
  { value: 'INVITE_CREATE', label: 'Invite created' },
  { value: 'USER_SUSPEND', label: 'User suspend' },
  { value: 'USER_REACTIVATE', label: 'User reactivate' },
  { value: 'ROLE_CHANGE', label: 'Role change' },
  { value: 'BULK_SUSPEND', label: 'Bulk suspend' },
  { value: 'BULK_REACTIVATE', label: 'Bulk reactivate' },
  { value: 'USER_IMPERSONATE', label: 'Impersonate' },
]

interface AuditTrailViewProps {
  className?: string
}

export function AuditTrailView({ className }: AuditTrailViewProps) {
  const [page, setPage] = useState(1)
  const [actionType, setActionType] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit', page, actionType],
    queryFn: () =>
      adminApi.getAudit({
        page,
        perPage: 20,
        actionType: actionType || undefined,
      }),
  })

  const handleExportCsv = async () => {
    const base = import.meta.env.VITE_API_URL ?? '/api'
    const params = new URLSearchParams({ export: 'csv', perPage: '1000' })
    if (actionType) params.set('actionType', actionType)
    const url = `${base}/admin/audit?${params}`
    const token = localStorage.getItem('admin_token')
    try {
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `admin-audit-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      window.open(url, '_blank', 'noopener')
    }
  }

  const logs = data?.data ?? data?.logs ?? []
  const total = data?.total ?? 0
  const perPage = data?.perPage ?? 20

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-lg font-semibold">Audit trail</h3>
        <div className="flex items-center gap-2">
          <div className="w-[180px]">
            <Select
              options={actionTypeOptions}
              value={actionType}
              onValueChange={(v) => {
                setActionType(v)
                setPage(1)
              }}
              placeholder="Filter by action"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
          <p className="font-medium">No audit entries</p>
          <p className="mt-1 text-sm text-muted-foreground">Admin actions will appear here</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((entry: AdminActionEntry) => (
                <React.Fragment key={entry.id}>
                  <TableRow
                    key={entry.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  >
                    <TableCell className="text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>{entry.admin_email}</TableCell>
                    <TableCell>{entry.action_type}</TableCell>
                    <TableCell>{entry.target_user_email || entry.target_user_id || '—'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{entry.reason || '—'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        {expandedId === entry.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedId === entry.id && entry.payload && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/30 p-4">
                        <pre className="overflow-x-auto text-xs">
                          {typeof entry.payload === 'string'
                            ? entry.payload
                            : JSON.stringify(entry.payload, null, 2)}
                        </pre>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {total > perPage && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {Math.ceil(total / perPage)} ({total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= Math.ceil(total / perPage)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
