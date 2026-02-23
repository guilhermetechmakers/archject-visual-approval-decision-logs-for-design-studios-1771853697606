import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  User,
  Shield,
  Monitor,
  Plug,
  Key,
  Smartphone,
  Trash2,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const PROFILE_NAV_ITEMS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'sessions', label: 'Sessions', icon: Monitor },
  { id: 'connected-accounts', label: 'Connected accounts', icon: Plug },
  { id: 'password', label: 'Password', icon: Key },
  { id: '2fa', label: 'Two-factor auth', icon: Smartphone },
  { id: 'delete', label: 'Delete account', icon: Trash2 },
] as const

const SIDEBAR_KEY = 'archject-profile-sidebar-collapsed'

function getInitialCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === 'true'
  } catch {
    return false
  }
}

export interface UserProfileLayoutProps {
  children: React.ReactNode
  activeSection?: string
}

export function UserProfileLayout({ children, activeSection = 'profile' }: UserProfileLayoutProps) {
  const [collapsed, setCollapsed] = useState(getInitialCollapsed)

  const handleToggle = () => {
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem(SIDEBAR_KEY, String(next))
    } catch {
      // ignore
    }
  }

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="space-y-8 animate-in">
      {/* Breadcrumb & header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              to="/dashboard"
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <span>/</span>
            <Link to="/dashboard/settings" className="hover:text-foreground transition-colors">
              Settings
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Profile</span>
          </nav>
          <h1 className="mt-2 text-2xl font-bold">User profile</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your account details, security, and connected integrations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard/settings"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
            Studio settings
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Collapsible sidebar */}
        <nav
          className={cn(
            'shrink-0 transition-all duration-300',
            collapsed ? 'lg:w-16' : 'lg:w-56'
          )}
          aria-label="Profile sections"
        >
          <div className="rounded-xl border border-border bg-card p-2 shadow-card">
            <div className="flex items-center justify-between px-2 py-1 lg:px-0">
              {!collapsed && (
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Sections
                </span>
              )}
              <button
                type="button"
                onClick={handleToggle}
                className="hidden rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:flex"
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </button>
            </div>
            <ul className="mt-2 space-y-0.5">
              {PROFILE_NAV_ITEMS.map((item) => {
                const isActive = activeSection === item.id
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => scrollToSection(item.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        collapsed && 'justify-center px-2'
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </nav>

        {/* Main content - 12-column grid */}
        <div className="min-w-0 flex-1">
          <div className="grid gap-6 lg:grid-cols-12">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
