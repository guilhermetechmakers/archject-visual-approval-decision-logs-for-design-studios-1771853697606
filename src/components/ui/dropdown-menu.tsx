import * as React from 'react'
import { cn } from '@/lib/utils'

interface DropdownMenuContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null)

interface DropdownMenuProps {
  children: React.ReactNode
}

function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false)
  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  )
}

interface DropdownMenuTriggerProps {
  children: React.ReactNode
  asChild?: boolean
  className?: string
}

function DropdownMenuTrigger({ children, asChild, className }: DropdownMenuTriggerProps) {
  const ctx = React.useContext(DropdownMenuContext)
  if (!ctx) return null
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    ctx.setOpen(!ctx.open)
  }
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void; className?: string }>, {
      onClick: handleClick,
      className: cn(className, (children as React.ReactElement).props.className),
    } as Record<string, unknown>)
  }
  return (
    <button type="button" onClick={handleClick} className={cn(className)}>
      {children}
    </button>
  )
}

interface DropdownMenuContentProps {
  children: React.ReactNode
  className?: string
  align?: 'start' | 'end' | 'center'
}

function DropdownMenuContent({ children, className, align = 'end' }: DropdownMenuContentProps) {
  const ctx = React.useContext(DropdownMenuContext)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        ctx?.setOpen(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') ctx?.setOpen(false)
    }
    if (ctx?.open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [ctx?.open])

  if (!ctx?.open) return null
  return (
    <div
      ref={ref}
      role="menu"
      className={cn(
        'absolute z-50 min-w-[8rem] overflow-hidden rounded-lg border border-border bg-card p-1 shadow-lg animate-scale-in',
        align === 'end' && 'right-0 top-full mt-1',
        align === 'start' && 'left-0 top-full mt-1',
        align === 'center' && 'left-1/2 top-full mt-1 -translate-x-1/2',
        className
      )}
    >
      {children}
    </div>
  )
}

function DropdownMenuItem({
  children,
  onClick,
  className,
  disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
}) {
  const ctx = React.useContext(DropdownMenuContext)
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={() => {
        onClick?.()
        ctx?.setOpen(false)
      }}
      className={cn(
        'relative flex w-full cursor-default select-none items-center rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-muted focus:bg-muted disabled:pointer-events-none disabled:opacity-50',
        className
      )}
    >
      {children}
    </button>
  )
}

function DropdownMenuSeparator() {
  return <div className="-mx-1 my-1 h-px bg-border" />
}

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator }
