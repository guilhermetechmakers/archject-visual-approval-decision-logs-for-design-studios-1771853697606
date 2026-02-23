import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose, SheetBody } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from './status-badge'
import { RolePill } from './role-pill'
import { Select, type SelectOption } from '@/components/ui/select'
import { Ticket, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'
import { adminApi } from '@/api/admin'
import { useState, useEffect } from 'react'

interface UserDetailSlideOverProps {
  userId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSupportTicketsClick?: () => void
  onImpersonate?: (userId: string) => void
  canImpersonate?: boolean
}

const roleOptions: SelectOption[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'reviewer', label: 'Reviewer' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'member', label: 'Member' },
]

export function UserDetailSlideOver({
  userId,
  open,
  onOpenChange,
  onImpersonate,
  canImpersonate = false,
}: UserDetailSlideOverProps) {
  const queryClient = useQueryClient()
  const [displayName, setDisplayName] = useState('')
  const [roleId, setRoleId] = useState('')

  const { data: user, isLoading } = useQuery({
    queryKey: ['admin', 'user', userId],
    queryFn: () => adminApi.getUser(userId!),
    enabled: !!userId && open,
  })

  const updateMutation = useMutation({
    mutationFn: (data: { displayName?: string; roleId?: string; reason?: string }) =>
      adminApi.updateUser(userId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', userId] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('User updated')
    },
    onError: () => toast.error('Failed to update user'),
  })

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || user.name || '')
      setRoleId(user.role || 'member')
    }
  }, [user])

  const handleSave = () => {
    const updates: { displayName?: string; roleId?: string; reason?: string } = {}
    if (displayName && displayName !== (user?.displayName || user?.name)) updates.displayName = displayName
    if (roleId && roleId !== user?.role) updates.roleId = roleId
    if (Object.keys(updates).length > 0) {
      updates.reason = 'Updated from admin panel'
      updateMutation.mutate(updates)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md sm:max-w-lg">
        <SheetClose />
        {isLoading ? (
          <SheetBody>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="mt-4 h-32 w-full" />
          </SheetBody>
        ) : user ? (
          <>
            <SheetHeader>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </div>
                <div>
                  <SheetTitle>{user.name || user.email}</SheetTitle>
                  <SheetDescription>{user.email}</SheetDescription>
                  <div className="mt-2 flex items-center gap-2">
                    <StatusBadge status={user.status as 'active' | 'suspended' | 'invited'} />
                    <RolePill role={user.role} />
                  </div>
                </div>
              </div>
            </SheetHeader>
            <SheetBody>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="displayName">Display name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <div className="mt-2">
                    <Select
                      options={roleOptions}
                      value={roleId}
                      onValueChange={setRoleId}
                      placeholder="Select role"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last login</p>
                  <p className="mt-1 text-sm">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created</p>
                  <p className="mt-1 text-sm">{new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
                {user.studios && user.studios.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Studios</p>
                    <p className="mt-1 text-sm">{user.studios.map((s) => s.name).join(', ')}</p>
                  </div>
                )}
                <Button onClick={handleSave} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving...' : 'Save changes'}
                </Button>
                <div className="flex flex-col gap-2">
                  <Link to="/admin/tickets">
                    <Button variant="outline" className="w-full">
                      <Ticket className="mr-2 h-4 w-4" />
                      View support tickets
                    </Button>
                  </Link>
                  {canImpersonate && onImpersonate && userId && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => onImpersonate(userId)}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Impersonate user
                    </Button>
                  )}
                </div>
              </div>
            </SheetBody>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
