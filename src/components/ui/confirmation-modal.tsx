import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ConfirmationModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
  isLoading?: boolean
  disabled?: boolean
  children?: React.ReactNode
  className?: string
}

/**
 * Generic confirmation modal for irreversible actions (account deletion, session revocation, etc.)
 */
export function ConfirmationModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  isLoading = false,
  disabled = false,
  children,
  className,
}: ConfirmationModalProps) {
  const handleConfirm = async () => {
    await onConfirm()
  }

  const isDestructive = variant === 'destructive'

  return (
    <Dialog open={open}>
      <DialogContent onClose={onClose} className={cn('max-w-md', className)}>
        <DialogHeader>
          <DialogTitle id="confirmation-modal-title">{title}</DialogTitle>
          <DialogDescription id="confirmation-modal-desc">
            {description}
          </DialogDescription>
        </DialogHeader>
        {children && <div className="py-2">{children}</div>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={disabled || isLoading}
          >
            {isLoading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Processing...
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
