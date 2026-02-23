import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  UserSearchBar,
  UsersTable,
  UserDetailSlideOver,
  InviteUserModal,
  BulkActionConfirmModal,
  AuditTrailView,
  AnalyticsCards,
  type UserSearchFilters,
  type BulkActionType,
} from '@/components/admin/user-management'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { adminApi, type AdminUser } from '@/api/admin'
import { UserPlus, ChevronDown, Ban, UserCheck, UserCog } from 'lucide-react'

const defaultFilters: UserSearchFilters = {
  q: '',
  status: '',
  role: '',
  sortBy: 'createdAt',
  sortDir: 'desc',
}

export function AdminUsersPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<UserSearchFilters>(defaultFilters)
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [detailUserId, setDetailUserId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [bulkAction, setBulkAction] = useState<{ action: BulkActionType; users: AdminUser[] } | null>(null)
  const [activeTab, setActiveTab] = useState('users')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', filters, page],
    queryFn: () =>
      adminApi.getUsers({
        q: filters.q || undefined,
        status: filters.status || undefined,
        role: filters.role || undefined,
        sortBy: filters.sortBy,
        sortDir: filters.sortDir,
        page,
        perPage: 20,
      }),
  })

  const users = data?.data ?? data?.users ?? []
  const total = data?.total ?? 0

  const bulkMutation = useMutation({
    mutationFn: (params: {
      action: BulkActionType
      userIds: string[]
      reason: string
      payload?: { roleId?: string }
    }) => adminApi.bulkAction(params),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'analytics', 'users'] })
      const successCount = result.results?.filter((r) => r.success).length ?? 0
      toast.success(`${successCount} user(s) updated`)
      setBulkAction(null)
      setSelectedIds(new Set())
    },
    onError: () => toast.error('Bulk action failed'),
  })

  const suspendMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'suspend' | 'reactivate' }) =>
      adminApi.updateUser(id, {
        status: action === 'suspend' ? 'suspended' : 'active',
        reason: action === 'suspend' ? 'Suspended from admin panel' : 'Reactivated from admin panel',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', detailUserId] })
      toast.success('User status updated')
    },
    onError: () => toast.error('Action failed'),
  })

  const handleFiltersChange = useCallback((partial: Partial<UserSearchFilters>) => {
    setFilters((f) => ({ ...f, ...partial }))
    setPage(1)
  }, [])

  const handleSort = useCallback((sortBy: string, sortDir: string) => {
    setFilters((f) => ({ ...f, sortBy, sortDir }))
    setPage(1)
  }, [])

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(users.map((u) => u.id)))
      } else {
        setSelectedIds(new Set())
      }
    },
    [users]
  )

  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const handleUserClick = useCallback((user: AdminUser) => {
    setDetailUserId(user.id)
    setDetailOpen(true)
  }, [])

  const handleSuspend = useCallback((user: AdminUser) => {
    if (user.status === 'suspended') return
    if (window.confirm(`Suspend ${user.name || user.email}? They will not be able to log in.`)) {
      suspendMutation.mutate({ id: user.id, action: 'suspend' })
    }
  }, [suspendMutation])

  const handleReactivate = useCallback((user: AdminUser) => {
    if (user.status !== 'suspended') return
    suspendMutation.mutate({ id: user.id, action: 'reactivate' })
  }, [suspendMutation])

  const handleBulkConfirm = useCallback(
    (reason: string, payload?: { roleId?: string }) => {
      if (!bulkAction) return
      bulkMutation.mutate({
        action: bulkAction.action,
        userIds: bulkAction.users.map((u) => u.id),
        reason,
        payload,
      })
    },
    [bulkAction, bulkMutation]
  )

  const handleKpiClick = useCallback((filter: { status?: string }) => {
    setFilters((f) => ({ ...f, status: filter.status ?? '' }))
    setActiveTab('users')
  }, [])

  const selectedUsers = users.filter((u) => selectedIds.has(u.id))

  return (
    <div className="space-y-8 animate-in">
      <div>
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="mt-1 text-muted-foreground">
          View, invite, suspend, reactivate, and manage platform users
        </p>
      </div>

      <AnalyticsCards onKpiClick={handleKpiClick} />

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Users</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="bg-[rgb(0,82,204)] text-white hover:bg-[rgb(0,82,204)]/90"
                onClick={() => setInviteOpen(true)}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Invite user
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={selectedIds.size === 0}
                  >
                    Bulk actions
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      setBulkAction({
                        action: 'suspend',
                        users: selectedUsers,
                      })
                    }
                  >
                    <Ban className="mr-2 h-4 w-4" />
                    Suspend users
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      setBulkAction({
                        action: 'reactivate',
                        users: selectedUsers,
                      })
                    }
                  >
                    <UserCheck className="mr-2 h-4 w-4" />
                    Reactivate users
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      setBulkAction({
                        action: 'change_role',
                        users: selectedUsers,
                      })
                    }
                  >
                    <UserCog className="mr-2 h-4 w-4" />
                    Change role
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="audit">Audit trail</TabsTrigger>
            </TabsList>
            <TabsContent value="users" className="mt-6">
              <UserSearchBar
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onSearch={() => setPage(1)}
              />
              <div className="mt-4">
                <UsersTable
                  users={users}
                  total={total}
                  page={page}
                  perPage={20}
                  sortBy={filters.sortBy}
                  sortDir={filters.sortDir}
                  selectedIds={selectedIds}
                  onSelectAll={handleSelectAll}
                  onSelectOne={handleSelectOne}
                  onSort={handleSort}
                  onUserClick={handleUserClick}
                  onSuspend={handleSuspend}
                  onReactivate={handleReactivate}
                  onChangeRole={() => {}}
                  isLoading={isLoading}
                  canImpersonate={false}
                />
              </div>
              {total > 20 && (
                <div className="mt-4 flex justify-end gap-2">
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
                    disabled={page >= Math.ceil(total / 20)}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </TabsContent>
            <TabsContent value="audit" className="mt-6">
              <AuditTrailView />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <UserDetailSlideOver
        userId={detailUserId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <InviteUserModal open={inviteOpen} onOpenChange={setInviteOpen} />

      {bulkAction && (
        <BulkActionConfirmModal
          open={!!bulkAction}
          onOpenChange={(open) => !open && setBulkAction(null)}
          action={bulkAction.action}
          users={bulkAction.users}
          onConfirm={handleBulkConfirm}
          isLoading={bulkMutation.isPending}
        />
      )}
    </div>
  )
}
