import { useState } from 'react'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface TocItem {
  id: string
  label: string
}

const tocItems: TocItem[] = [
  { id: 'what-we-collect', label: 'What We Collect' },
  { id: 'how-we-use', label: 'How We Use Your Data' },
  { id: 'legal-bases', label: 'Legal Bases & Processors' },
  { id: 'storage-security', label: 'Storage, Security & Encryption' },
  { id: 'backups-recovery', label: 'Backups & Recovery' },
  { id: 'data-retention', label: 'Data Retention & Deletion' },
  { id: 'data-portability', label: 'Data Portability & Account Export' },
  { id: 'cookies-tracking', label: 'Cookies & Tracking' },
  { id: 'childrens-data', label: "Children's Data" },
  { id: 'international-transfers', label: 'International Transfers' },
  { id: 'contact-request', label: 'How to Contact Us / Make a Request' },
  { id: 'changes', label: 'Changes to Policy' },
]

export function PrivacyToc() {
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleClick = (id: string) => {
    const el = document.getElementById(id)
    el?.scrollIntoView({ behavior: 'smooth' })
    setMobileOpen(false)
  }

  return (
    <>
      {/* Desktop: sticky sidebar */}
      <nav
        className="hidden lg:block lg:w-56 lg:shrink-0 lg:sticky lg:top-24"
        aria-label="Table of contents"
      >
        <h2 className="text-sm font-semibold text-foreground mb-4">On this page</h2>
        <ul className="space-y-2">
          {tocItems.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  handleClick(item.id)
                }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded px-1 py-0.5 block"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile: collapsible */}
      <div className="lg:hidden mb-6">
        <Button
          variant="outline"
          className="w-full justify-between"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-controls="privacy-toc-mobile"
        >
          <span>Jump to section</span>
          <Menu className={cn('h-4 w-4 transition-transform', mobileOpen && 'rotate-90')} />
        </Button>
        <div
          id="privacy-toc-mobile"
          role="region"
          aria-label="Table of contents"
          className={cn(
            'mt-2 overflow-hidden transition-all duration-200',
            mobileOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <ul className="space-y-2 border border-border rounded-lg p-4 bg-card">
            {tocItems.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    handleClick(item.id)
                  }}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1 py-1 block"
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
