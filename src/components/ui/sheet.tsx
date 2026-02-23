import * as React from 'react'
import { useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface SheetContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SheetContext = React.createContext<SheetContextValue | null>(null)

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

function Sheet({ open, onOpenChange, children }: SheetProps) {
  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  )
}

interface SheetContentProps {
  children: React.ReactNode
  className?: string
  side?: 'left' | 'right'
}

function SheetContent({ children, className, side = 'right' }: SheetContentProps) {
  const ctx = React.useContext(SheetContext)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') ctx?.onOpenChange(false)
    },
    [ctx]
  )

  useEffect(() => {
    if (ctx?.open) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [ctx?.open, handleKeyDown])

  if (!ctx?.open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 animate-in"
        onClick={() => ctx.onOpenChange(false)}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'fixed inset-y-0 z-50 w-full max-w-lg border-l border-border bg-card shadow-xl transition-transform duration-300 ease-out',
          side === 'right' && 'right-0 animate-slide-in-right',
          side === 'left' && 'left-0 animate-slide-in-left',
          className
        )}
      >
        {children}
      </div>
    </>
  )
}

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 p-6 pb-4', className)} {...props} />
}

function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
}

function SheetDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

function SheetClose({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ctx = React.useContext(SheetContext)
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('absolute right-4 top-4', className)}
      onClick={() => ctx?.onOpenChange(false)}
      aria-label="Close"
      {...props}
    >
      <X className="h-4 w-4" />
    </Button>
  )
}

function SheetBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('overflow-y-auto p-6 pt-0', className)} {...props} />
}

export { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose, SheetBody }
