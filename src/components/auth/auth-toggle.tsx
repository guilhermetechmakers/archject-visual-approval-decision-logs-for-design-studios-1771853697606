import { cn } from '@/lib/utils'

export type AuthTab = 'login' | 'signup'

interface AuthToggleProps {
  value: AuthTab
  onChange: (value: AuthTab) => void
  className?: string
}

export function AuthToggle({ value, onChange, className }: AuthToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Sign in or sign up"
      className={cn(
        'flex rounded-lg bg-[#F3F4F6] p-1',
        className
      )}
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === 'login'}
        aria-controls="login-panel"
        id="login-tab"
        onClick={() => onChange('login')}
        className={cn(
          'flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-all duration-200',
          value === 'login'
            ? 'bg-white text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <span className={cn(
          'block pb-0.5',
          value === 'login' && 'border-b-2 border-[#0052CC]'
        )}>
          Sign in
        </span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === 'signup'}
        aria-controls="signup-panel"
        id="signup-tab"
        onClick={() => onChange('signup')}
        className={cn(
          'flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-all duration-200',
          value === 'signup'
            ? 'bg-white text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <span className={cn(
          'block pb-0.5',
          value === 'signup' && 'border-b-2 border-[#0052CC]'
        )}>
          Create account
        </span>
      </button>
    </div>
  )
}
