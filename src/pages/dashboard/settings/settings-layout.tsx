import { NavLink, Outlet } from 'react-router-dom'
import {
  Palette,
  Users,
  CreditCard,
  Plug,
  Database,
  User,
  Settings2,
  HardDrive,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/dashboard/settings', end: true, icon: Palette, label: 'Branding' },
  { to: '/dashboard/settings/team', end: false, icon: Users, label: 'Team' },
  { to: '/dashboard/settings/subscriptions', end: false, icon: CreditCard, label: 'Subscriptions' },
  { to: '/dashboard/settings/integrations', end: false, icon: Plug, label: 'Integrations' },
  { to: '/dashboard/settings/project-defaults', end: false, icon: Settings2, label: 'Project Defaults' },
  { to: '/dashboard/settings/backups', end: false, icon: HardDrive, label: 'Backups' },
  { to: '/dashboard/settings/profile', end: false, icon: User, label: 'User Profile' },
  { to: '/dashboard/settings/data', end: false, icon: Database, label: 'Data & Privacy' },
]

const billingItem = {
  to: '/dashboard/billing',
  end: false,
  icon: CreditCard,
  label: 'Billing',
}

export function SettingsLayout() {
  return (
    <div className="space-y-8 animate-in">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight">Settings & Team Management</h1>
        <p className="mt-1 text-muted-foreground text-[15px] leading-relaxed">
          Studio configuration, branding, team roles, subscriptions, and integrations
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav
          className="lg:w-56 shrink-0"
          aria-label="Settings navigation"
        >
          <ul className="space-y-1 rounded-xl border border-border bg-card p-2 shadow-sm">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                  {item.label}
                </NavLink>
              </li>
            ))}
            <li className="border-t border-border pt-2 mt-2">
              <NavLink
                to={billingItem.to}
                end={billingItem.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )
                }
              >
                <billingItem.icon className="h-4 w-4 shrink-0" aria-hidden />
                {billingItem.label}
                <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-60" aria-hidden />
              </NavLink>
            </li>
          </ul>
        </nav>
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
