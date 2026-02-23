import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from '@/components/ui/sheet'

const NAV_LINKS = [
  { to: '/#features', label: 'Product' },
  { to: '/#how-it-works', label: 'How it works' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/about', label: 'About' },
  { to: '/help', label: 'Help' },
] as const

interface LandingHeaderProps {
  onBookDemo?: () => void
}

export function LandingHeader({ onBookDemo }: LandingHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 lg:px-8" aria-label="Main navigation">
        <Link to="/" className="text-xl font-bold text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg">
          Archject
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link to="/auth?tab=login">
            <Button variant="ghost" size="sm" className="focus-visible:ring-2 focus-visible:ring-ring">
              Log in
            </Button>
          </Link>
          {onBookDemo && (
            <Button variant="outline" size="sm" onClick={onBookDemo} className="focus-visible:ring-2 focus-visible:ring-ring">
              Request a demo
            </Button>
          )}
          <Link to="/signup">
            <Button size="sm" className="bg-[#0052CC] hover:bg-[#0052CC]/90 focus-visible:ring-2 focus-visible:ring-ring">
              Sign up
            </Button>
          </Link>
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg md:hidden text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </nav>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-full max-w-md">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-4 pt-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className="text-base font-medium text-foreground hover:text-primary py-2"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
              <Link to="/auth?tab=login" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  Log in
                </Button>
              </Link>
              {onBookDemo && (
                <Button variant="outline" className="w-full" onClick={() => { onBookDemo(); setMobileOpen(false); }}>
                  Request a demo
                </Button>
              )}
              <Link to="/signup" onClick={() => setMobileOpen(false)}>
                <Button className="w-full bg-[#0052CC] hover:bg-[#0052CC]/90">
                  Sign up
                </Button>
              </Link>
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </header>
  )
}
