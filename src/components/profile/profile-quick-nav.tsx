import { User, Shield, Monitor, Plug, Key, Smartphone, Trash2, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'password', label: 'Password', icon: Key },
  { id: '2fa', label: 'Two-factor auth', icon: Smartphone },
  { id: 'password-reset', label: 'Password reset', icon: Mail },
  { id: 'sessions', label: 'Sessions', icon: Monitor },
  { id: 'connected', label: 'Connected accounts', icon: Plug },
  { id: 'delete', label: 'Delete account', icon: Trash2 },
] as const

export interface ProfileQuickNavProps {
  activeSection: string | null
  onNavigate: (id: string) => void
}

export function ProfileQuickNav({ activeSection, onNavigate }: ProfileQuickNavProps) {
  return (
    <ul className="space-y-0.5" role="navigation" aria-label="Profile sections">
      {NAV_ITEMS.map((item) => {
        const isActive = activeSection === item.id
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onNavigate(item.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
