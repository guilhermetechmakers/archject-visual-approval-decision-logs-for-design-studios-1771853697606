import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'


export type SSOProvider = 'google' | 'apple' | 'microsoft'

interface SSOButtonsProps {
  redirectTo?: string
  className?: string
  /** Providers to show as disabled (coming soon) */
  disabledProviders?: SSOProvider[]
}

const GOOGLE_ICON = (
  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
)

const APPLE_ICON = (
  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
)

const MICROSOFT_ICON = (
  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
    <path fill="#f25022" d="M1 1h10v10H1z" />
    <path fill="#00a4ef" d="M1 13h10v10H1z" />
    <path fill="#7fba00" d="M13 1h10v10H13z" />
    <path fill="#ffb900" d="M13 13h10v10H13z" />
  </svg>
)

const PROVIDERS: { id: SSOProvider; label: string; icon: React.ReactNode }[] = [
  { id: 'google', label: 'Continue with Google', icon: GOOGLE_ICON },
  { id: 'apple', label: 'Continue with Apple', icon: APPLE_ICON },
  { id: 'microsoft', label: 'Continue with Microsoft', icon: MICROSOFT_ICON },
]

export function SSOButtons({
  redirectTo = '/dashboard',
  className,
  disabledProviders = ['apple', 'microsoft'],
}: SSOButtonsProps) {
  const handleRedirect = (provider: SSOProvider) => {
    if (provider === 'google') {
      const redirect = encodeURIComponent(redirectTo)
      window.location.href = `/api/auth/oauth/google?redirect=${redirect}`
    }
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {PROVIDERS.map(({ id, label, icon }) => {
        const disabled = disabledProviders.includes(id)
        return (
          <Button
            key={id}
            variant="outline"
            type="button"
            className={cn(
              'w-full justify-start gap-3 border-[#E5E7EB] bg-white text-[#111827]',
              'hover:bg-[#F3F4F6] transition-all duration-200 ease-out',
              'hover:scale-[1.02] hover:shadow-sm',
              disabled && 'opacity-60 cursor-not-allowed'
            )}
            onClick={() => !disabled && handleRedirect(id)}
            disabled={disabled}
            aria-label={disabled ? `${label} (coming soon)` : label}
          >
            {icon}
            {label}
            {disabled && (
              <span className="ml-auto text-xs text-muted-foreground">(coming soon)</span>
            )}
          </Button>
        )
      })}
    </div>
  )
}
