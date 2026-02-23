import * as React from 'react'
import { useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface DialogProps {
  open: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  className?: string
}

function Dialog({ open, children, className }: DialogProps) {
  if (!open) return null
  return (
    <div className={cn('fixed inset-0 z-50', className)}>
      {children}
    </div>
  )
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  onClose?: () => void
  showClose?: boolean
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, onClose, showClose = true, ...props }, ref) => {
    const contentRef = useRef<HTMLDivElement>(null)

    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose?.()
        }
      },
      [onClose]
    )

    useEffect(() => {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = ''
      }
    }, [handleKeyDown])

    const handleBackdropClick = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose?.()
      }
    }

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={handleBackdropClick}
        aria-hidden="true"
      >
        <div
          className="fixed inset-0 bg-black/50 animate-in"
          aria-hidden="true"
        />
        <div
          ref={ref ?? contentRef}
          role="dialog"
          aria-modal="true"
          className={cn(
            'relative z-50 w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl animate-scale-in',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            className
          )}
          onClick={(e) => e.stopPropagation()}
          {...props}
        >
          {showClose && onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          {children}
        </div>
      </div>
    )
  }
)
DialogContent.displayName = 'DialogContent'

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

function DialogHeader({ className, ...props }: DialogHeaderProps) {
  return <div className={cn('flex flex-col space-y-1.5 pr-8', className)} {...props} />
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
}

function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2 mt-6', className)} {...props} />
  )
}

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter }
