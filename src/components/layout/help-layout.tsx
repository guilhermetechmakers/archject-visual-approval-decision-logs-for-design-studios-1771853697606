import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { Menu, HelpCircle, BookOpen, Shield, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/help'

const helpNavItems = [
  { to: '/help', label: 'Help Center', icon: HelpCircle },
  { to: '/about', label: 'About', icon: BookOpen },
  { to: '/privacy', label: 'Privacy', icon: Shield },
  { to: '/terms', label: 'Terms', icon: FileText },
]

export function HelpLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      <div
        className={cn('fixed inset-0 z-40 bg-black/50 lg:hidden', mobileOpen ? 'block' : 'hidden')}
        onClick={() => setMobileOpen(false)}
        aria-hidden
      />

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-border bg-card transition-transform duration-300 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link to="/" className="text-xl font-bold text-primary">
            Archject
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden"
            aria-label="Close menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {helpNavItems.map((item) => {
            const isActive = location.pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-border p-4">
          <Link
            to="/login"
            className="mb-2 block rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="block rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Sign up
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card px-4 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <SearchBar className="max-w-xl" />
          </div>
        </header>

        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
