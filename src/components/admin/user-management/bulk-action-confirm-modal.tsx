import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { AdminUser } from '@/api/admin'

export type BulkActionType = 'suspend' | 'reactivate' | 'change_role' | 'remove' | 'resend_invite'

interface BulkActionConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  action: BulkActionType
  users: AdminUser[]
  onConfirm: (reason: string, payload?: { roleId?: string }) => void
  isLoading?: boolean
}

const actionLabels: Record<BulkActionType, string> = {
  suspend: 'Suspend users',
  reactivate: 'Reactivate users',
  change_role: 'Change role',
  remove: 'Remove users',
  resend_invite: 'Resend invites',
}

const actionDescriptions: Record<BulkActionType, string> = {
  suspend: 'Suspended users will not be able to log in until reactivated. Their tokens will be revoked.',
  reactivate: 'Reactivated users will be able to log in again.',
  change_role: 'Select a new role for all selected users.',
  remove: 'Removed users will lose access to the platform. This action cannot be undone.',
  resend_invite: 'Invitation emails will be resent to the selected users.',
}

export function BulkActionConfirmModal({
  open,
  onOpenChange,
  action,
  users,
  onConfirm,
  isLoading,
}: BulkActionConfirmModalProps) {
  const [reason, setReason] = useState('')
  const [roleId, setRoleId] = useState('')

  const handleConfirm = () => {
    if (!reason.trim() || reason.trim().length < 10) return
    const payload = action === 'change_role' && roleId ? { roleId } : undefined
    onConfirm(reason, payload)
    setReason('')
    setRoleId('')
    onOpenChange(false)
  }

  const isValid = reason.trim().length >= 10
  const previewCount = Math.min(users.length, 100)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>{actionLabels[action]}</DialogTitle>
          <DialogDescription>{actionDescriptions[action]}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {users.length} user{users.length !== 1 ? 's' : ''} selected
            </p>
            <ul className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-border p-2 text-sm">
              {users.slice(0, previewCount).map((u) => (
                <li key={u.id} className="truncate">
                  {u.name || u.email} ({u.email})
                </li>
              ))}
              {users.length > 100 && (
                <li className="text-muted-foreground">...and {users.length - 100} more</li>
              )}
            </ul>
          </div>
          <div>
            <Label htmlFor="reason">Reason (required, min 10 characters)</Label>
            <Textarea
              id="reason"
              placeholder="Provide a reason for this action for audit purposes..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2 min-h-[80px]"
              rows={3}
            />
          </div>
          {action === 'change_role' && (
            <div>
              <Label>New role</Label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select role</option>
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="reviewer">Reviewer</option>
                <option value="viewer">Viewer</option>
                <option value="member">Member</option>
              </select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={action === 'suspend' || action === 'remove' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={!isValid || isLoading || (action === 'change_role' && !roleId)}
          >
            {isLoading ? 'Processing...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
