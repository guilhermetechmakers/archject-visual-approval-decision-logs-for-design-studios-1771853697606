import {
  MoreHorizontal,
  User,
  UserCog,
  Mail,
  Ban,
  UserCheck,
  Trash2,
  Eye,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import type { AdminUser } from '@/api/admin'

interface AdminActionsMenuProps {
  user: AdminUser
  onView: () => void
  onImpersonate?: () => void
  onChangeRole: () => void
  onResendInvite?: () => void
  onSuspend: () => void
  onReactivate: () => void
  onRemove?: () => void
  canImpersonate?: boolean
}

export function AdminActionsMenu({
  user,
  onView,
  onImpersonate,
  onChangeRole,
  onResendInvite,
  onSuspend,
  onReactivate,
  onRemove,
  canImpersonate = false,
}: AdminActionsMenuProps) {
  const isSuspended = user.status === 'suspended'
  const isInvited = user.status === 'invited'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Open user actions menu">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onView}>
          <Eye className="mr-2 h-4 w-4" />
          View details
        </DropdownMenuItem>
        {canImpersonate && (
          <DropdownMenuItem onClick={onImpersonate}>
            <UserCog className="mr-2 h-4 w-4" />
            Impersonate
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onChangeRole}>
          <User className="mr-2 h-4 w-4" />
          Change role
        </DropdownMenuItem>
        {isInvited && onResendInvite && (
          <DropdownMenuItem onClick={onResendInvite}>
            <Mail className="mr-2 h-4 w-4" />
            Resend invite
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {isSuspended ? (
          <DropdownMenuItem onClick={onReactivate}>
            <UserCheck className="mr-2 h-4 w-4" />
            Reactivate
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onSuspend} className="text-destructive focus:text-destructive">
            <Ban className="mr-2 h-4 w-4" />
            Suspend
          </DropdownMenuItem>
        )}
        {onRemove && (
          <DropdownMenuItem onClick={onRemove} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
