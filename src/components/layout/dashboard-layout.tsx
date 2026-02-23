import { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'

const SIDEBAR_KEY = 'archject-sidebar-collapsed'

function getInitialCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === 'true'
  } catch {
    return false
  }
}

export function DashboardLayout() {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(getInitialCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
      e.preventDefault()
      navigate('/dashboard/search')
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  const handleToggle = () => {
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem(SIDEBAR_KEY, String(next))
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        collapsed={collapsed}
        onToggle={handleToggle}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div
        className={cn(
          'transition-all duration-300',
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-[240px]'
        )}
      >
        <Topbar
          onMenuClick={() => setMobileOpen(true)}
          showMenuButton
        />

        <main
          className="p-4 lg:p-8"
          role="main"
        >
          <div className="grid grid-cols-12 gap-6 lg:gap-8">
            <div className="col-span-12 min-w-0">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
