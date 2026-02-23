import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, User, Trash2, History } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  getStudio,
  inviteTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
  getAuditLog,
  type TeamMember,
} from '@/api/studios'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Role = 'owner' | 'admin' | 'editor' | 'viewer'

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
]

function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
    owner: { variant: 'default', label: 'Owner' },
    admin: { variant: 'default', label: 'Admin' },
    editor: { variant: 'secondary', label: 'Editor' },
    viewer: { variant: 'outline', label: 'Viewer' },
    custom: { variant: 'outline', label: 'Custom' },
  }
  const { variant, label } = config[role] ?? config.viewer
  return (
    <Badge variant={variant} className="uppercase tracking-wider text-[10px]">
      {label}
    </Badge>
  )
}

const ACTION_LABELS: Record<string, string> = {
  team_member_invited: 'Invited',
  team_member_role_changed: 'Changed role',
  team_member_removed: 'Removed',
}

export function TeamRolesTable() {
  const queryClient = useQueryClient()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('viewer')
  const [removeModal, setRemoveModal] = useState<TeamMember | null>(null)
  const [removeConfirm, setRemoveConfirm] = useState('')
  const [auditOpen, setAuditOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<{ member: TeamMember; newRole: Role } | null>(null)

  const { data: studio, isLoading } = useQuery({
    queryKey: ['studio', 'default'],
    queryFn: () => getStudio('default'),
  })

  const { data: auditLog } = useQuery({
    queryKey: ['studio', 'default', 'audit'],
    queryFn: () => getAuditLog('default'),
    enabled: auditOpen,
  })

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      inviteTeamMember('default', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio', 'default'] })
      toast.success('Invitation sent')
      setInviteOpen(false)
      setInviteEmail('')
      setInviteRole('viewer')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      updateTeamMemberRole('default', memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio', 'default'] })
      toast.success('Role updated')
      setEditingRole(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeTeamMember('default', memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio', 'default'] })
      toast.success('Member removed')
      setRemoveModal(null)
      setRemoveConfirm('')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleInvite = () => {
    if (!inviteEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      toast.error('Enter a valid email')
      return
    }
    inviteMutation.mutate({ email: inviteEmail, role: inviteRole })
  }

  const handleRemove = () => {
    if (!removeModal || removeConfirm !== removeModal.email) return
    removeMutation.mutate(removeModal.id)
  }

  const members = studio?.team_members ?? []

  if (isLoading || !studio) {
    return (
      <Card className="card-hover">
        <CardHeader>
          <CardTitle>Team & roles</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-48 animate-pulse rounded-lg bg-muted" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="card-hover">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle>Team & roles</CardTitle>
            <CardDescription>
              Invite members and manage permissions. Owners and Admins can manage billing.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAuditOpen(true)}>
              <History className="mr-2 h-4 w-4" />
              Audit log
            </Button>
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite member
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left font-medium p-4">Member</th>
                    <th className="text-left font-medium p-4">Role</th>
                    <th className="text-left font-medium p-4">Status</th>
                    <th className="w-12 p-4" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">
                        No team members yet. Invite someone to get started.
                      </td>
                    </tr>
                  ) : (
                    members.map((m) => (
                      <tr
                        key={m.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{m.name ?? m.email}</p>
                              <p className="text-muted-foreground">{m.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          {editingRole?.member.id === m.id ? (
                            <select
                              value={editingRole.newRole}
                              onChange={(e) =>
                                setEditingRole({
                                  ...editingRole,
                                  newRole: e.target.value as Role,
                                })
                              }
                              className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                            >
                              {ROLE_OPTIONS.map((r) => (
                                <option key={r.value} value={r.value}>
                                  {r.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <RoleBadge role={m.role} />
                          )}
                        </td>
                        <td className="p-4">
                          <Badge variant={m.status === 'active' ? 'success' : 'warning'}>
                            {m.status}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {m.role !== 'owner' && (
                            <div className="flex gap-1">
                              {editingRole?.member.id === m.id ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      updateRoleMutation.mutate({
                                        memberId: m.id,
                                        role: editingRole.newRole,
                                      })
                                    }
                                    disabled={updateRoleMutation.isPending}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingRole(null)}
                                  >
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingRole({ member: m, newRole: m.role as Role })}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setRemoveModal(m)}
                                    className="text-destructive hover:bg-destructive/10"
                                    aria-label="Remove member"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Owners and Admins can manage subscriptions, payment methods, and view full invoices.
          </p>
        </CardContent>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent onClose={() => setInviteOpen(false)} className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite team member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your studio. They will receive an email with a link to accept.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@studio.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as Role)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? 'Sending...' : 'Send invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!removeModal} onOpenChange={(o) => !o && setRemoveModal(null)}>
        <DialogContent
          onClose={() => {
            setRemoveModal(null)
            setRemoveConfirm('')
          }}
          className="max-w-md"
        >
          <DialogHeader>
            <DialogTitle>Remove team member</DialogTitle>
            <DialogDescription>
              This will remove {removeModal?.email} from the studio. Type their email to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="remove-confirm">Type {removeModal?.email} to confirm</Label>
              <Input
                id="remove-confirm"
                value={removeConfirm}
                onChange={(e) => setRemoveConfirm(e.target.value)}
                placeholder={removeModal?.email}
                className={cn(
                  'mt-2',
                  removeConfirm && removeConfirm !== removeModal?.email && 'border-destructive'
                )}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveModal(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={removeConfirm !== removeModal?.email || removeMutation.isPending}
            >
              {removeMutation.isPending ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={auditOpen} onOpenChange={setAuditOpen}>
        <DialogContent onClose={() => setAuditOpen(false)} className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit log</DialogTitle>
            <DialogDescription>
              Recent team changes: invites, role updates, and removals
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {auditLog?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audit entries yet</p>
            ) : (
              auditLog?.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {entry.actor} {ACTION_LABELS[entry.action] ?? entry.action}
                    </p>
                    <p className="text-muted-foreground">
                      {entry.metadata && typeof entry.metadata === 'object' && 'email' in entry.metadata
                        ? `• ${String((entry.metadata as { email?: string }).email)}`
                        : ''}
                      {entry.metadata && typeof entry.metadata === 'object' && 'new_role' in entry.metadata
                        ? ` → ${String((entry.metadata as { new_role?: string }).new_role)}`
                        : ''}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
