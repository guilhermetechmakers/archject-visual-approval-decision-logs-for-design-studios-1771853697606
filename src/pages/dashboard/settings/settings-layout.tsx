import { NavLink, Outlet } from 'react-router-dom'
import { Palette, Users, CreditCard, Plug, Database } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/dashboard/settings', end: true, icon: Palette, label: 'Branding' },
  { to: '/dashboard/settings/team', end: false, icon: Users, label: 'Team & roles' },
  { to: '/dashboard/billing', end: false, icon: CreditCard, label: 'Billing' },
  { to: '/dashboard/settings/integrations', end: false, icon: Plug, label: 'Integrations' },
  { to: '/dashboard/settings/data', end: false, icon: Database, label: 'Data & Privacy' },
]

export function SettingsLayout() {
  return (
    <div className="space-y-8 animate-in">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Studio configuration, team management, and integrations
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav className="lg:w-56 shrink-0">
          <ul className="space-y-1 rounded-lg border border-border p-2">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
