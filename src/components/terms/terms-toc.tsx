import { useState } from 'react'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface TocItem {
  id: string
  label: string
}

function slugify(text: string): string {
  return text
    .replace(/^\d+\.\s*/, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function parseTocFromMarkdown(content: string): TocItem[] {
  const items: TocItem[] = []
  const regex = /^## (.+)$/gm
  let match
  while ((match = regex.exec(content)) !== null) {
    const label = match[1].trim()
    items.push({ id: slugify(label), label })
  }
  return items
}

interface TermsTocProps {
  items: TocItem[]
  className?: string
}

export function TermsToc({ items, className }: TermsTocProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleClick = (id: string) => {
    const el = document.getElementById(id)
    el?.scrollIntoView({ behavior: 'smooth' })
    setMobileOpen(false)
  }

  if (items.length === 0) return null

  return (
    <>
      <nav
        className={cn('hidden lg:block lg:w-56 lg:shrink-0 lg:sticky lg:top-24', className)}
        aria-label="Table of contents"
      >
        <h2 className="mb-4 text-sm font-semibold text-foreground">On this page</h2>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  handleClick(item.id)
                }}
                className="block rounded px-1 py-0.5 text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className={cn('mb-6 lg:hidden', className)}>
        <Button
          variant="outline"
          className="w-full justify-between"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-controls="terms-toc-mobile"
        >
          <span>Jump to section</span>
          <Menu className={cn('h-4 w-4 transition-transform', mobileOpen && 'rotate-90')} />
        </Button>
        <div
          id="terms-toc-mobile"
          role="region"
          aria-label="Table of contents"
          className={cn(
            'mt-2 overflow-hidden transition-all duration-200',
            mobileOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <ul className="space-y-2 rounded-lg border border-border bg-card p-4">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    handleClick(item.id)
                  }}
                  className="block rounded px-1 py-1 text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}
