import { useState } from 'react'
import { useParams, useNavigate, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Menu, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { TokenExpiryNotice } from './token-expiry-notice'
import { NotificationInbox } from './notification-inbox'
import { getClientBranding, getClientTokenStatus } from '@/api/client-portal'
import { cn } from '@/lib/utils'

export function ClientPortalLayout() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const { data: tokenStatus } = useQuery({
    queryKey: ['client-token-status', token],
    queryFn: () => getClientTokenStatus(token!),
    enabled: !!token,
  })

  const { data: branding } = useQuery({
    queryKey: ['client-branding', token],
    queryFn: () => getClientBranding(token!),
    enabled: !!token,
  })

  const navItems = [
    { label: 'Decisions', to: token ? `/client/${token}` : '#' },
    { label: 'Help', to: '/help' },
  ]

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] p-4">
        <p className="text-[rgb(107,114,128)]">Invalid link</p>
      </div>
    )
  }

  if (tokenStatus && !tokenStatus.valid) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F7F7F9] p-4">
        <TokenExpiryNotice variant="error" message={tokenStatus.message} />
        <Button
          variant="outline"
          onClick={() => navigate('/help')}
          className="rounded-lg"
        >
          Contact support
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F7F9]">
      {/* Topbar - mobile-first */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[rgb(229,231,235)] bg-[#FFFFFF] px-4">
        <div className="flex items-center gap-2">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <SheetContent side="left" className="w-[240px] p-0">
              <nav className="flex flex-col gap-1 p-4">
                {navItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      if (item.to.startsWith('http') || item.to === '/help') {
                        window.location.href = item.to
                      } else {
                        navigate(item.to)
                        setMobileOpen(false)
                      }
                    }}
                    className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[rgb(17,24,39)] hover:bg-[rgb(243,244,246)]"
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            {branding?.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt="Studio"
                className="h-8 w-auto max-w-[120px] object-contain"
              />
            ) : (
              <span
                className="text-lg font-bold"
                style={{ color: branding?.primaryColor ?? '#0052CC' }}
              >
                Archject
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <NotificationInbox token={token} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (window.location.href = '/help')}
            aria-label="Help"
          >
            <HelpCircle className="h-5 w-5 text-[rgb(107,114,128)]" />
          </Button>
        </div>
      </header>

      {/* Desktop sidebar - collapsible */}
      <aside
        className={cn(
          'fixed left-0 top-14 z-20 hidden h-[calc(100vh-3.5rem)] flex-col border-r border-[rgb(229,231,235)] bg-[#F5F6FA] transition-all duration-300 ease-in-out',
          'lg:flex',
          sidebarCollapsed ? 'w-[72px]' : 'w-[240px]'
        )}
      >
        <nav className="flex flex-1 flex-col gap-1 p-4">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                if (item.to.startsWith('http') || item.to === '/help') {
                  window.location.href = item.to
                } else {
                  navigate(item.to)
                }
              }}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[rgb(107,114,128)] transition-colors hover:bg-[rgb(229,231,235)] hover:text-[rgb(17,24,39)]',
                sidebarCollapsed && 'justify-center px-2'
              )}
            >
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="m-2 self-center"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </aside>

      {/* Main content */}
      <main
        className={cn(
          'min-h-[calc(100vh-3.5rem)] transition-all duration-300',
          'lg:pl-[240px]',
          sidebarCollapsed && 'lg:pl-[72px]'
        )}
      >
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          {tokenStatus?.valid && (
            <TokenExpiryNotice
              expiresAt={tokenStatus.expiresAt}
              className="mb-4"
            />
          )}
          <Outlet />
        </div>
      </main>
    </div>
  )
}
