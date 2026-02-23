import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AccordionContextValue {
  openItem: string | null
  setOpenItem: (value: string | null) => void
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null)

interface AccordionProps {
  defaultValue?: string
  children: React.ReactNode
  className?: string
}

export function Accordion({ defaultValue, children, className }: AccordionProps) {
  const [openItem, setOpenItem] = React.useState<string | null>(defaultValue ?? null)

  const handleSetOpen = React.useCallback((value: string | null) => {
    setOpenItem((prev) => (prev === value ? null : value))
  }, [])

  return (
    <AccordionContext.Provider value={{ openItem, setOpenItem: handleSetOpen }}>
      <div className={cn('space-y-1', className)} role="region" aria-label="Accordion">
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

interface AccordionItemProps {
  value: string
  children: React.ReactNode
  className?: string
}

export function AccordionItem({ value, children, className }: AccordionItemProps) {
  return (
    <div className={cn('border border-border rounded-lg overflow-hidden', className)} data-value={value}>
      {children}
    </div>
  )
}

interface AccordionTriggerProps {
  value: string
  children: React.ReactNode
  className?: string
}

export function AccordionTrigger({ value, children, className }: AccordionTriggerProps) {
  const ctx = React.useContext(AccordionContext)
  if (!ctx) throw new Error('AccordionTrigger must be used within Accordion')
  const { openItem, setOpenItem } = ctx
  const isOpen = openItem === value

  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center justify-between px-4 py-3 text-left font-medium transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isOpen && 'bg-muted/30',
        className
      )}
      onClick={() => setOpenItem(isOpen ? null : value)}
      aria-expanded={isOpen}
      aria-controls={`accordion-content-${value}`}
      id={`accordion-trigger-${value}`}
    >
      {children}
      <ChevronDown
        className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200', isOpen && 'rotate-180')}
        aria-hidden
      />
    </button>
  )
}

interface AccordionContentProps {
  value: string
  children: React.ReactNode
  className?: string
}

export function AccordionContent({ value, children, className }: AccordionContentProps) {
  const ctx = React.useContext(AccordionContext)
  if (!ctx) throw new Error('AccordionContent must be used within Accordion')
  const { openItem } = ctx
  const isOpen = openItem === value

  return (
    <div
      id={`accordion-content-${value}`}
      role="region"
      aria-labelledby={`accordion-trigger-${value}`}
      hidden={!isOpen}
      className={cn(
        'overflow-hidden transition-all duration-200',
        isOpen ? 'animate-in' : 'hidden'
      )}
    >
      <div className={cn('px-4 py-3 pt-0 text-sm text-muted-foreground border-t border-border', className)}>
        {children}
      </div>
    </div>
  )
}
