import { cn } from '@/lib/utils'

export type PasswordStrength = 'weak' | 'medium' | 'strong'

export function getPasswordStrength(password: string): { level: PasswordStrength; score: number } {
  if (!password) return { level: 'weak', score: 0 }
  let score = 0
  if (password.length >= 12) score++
  else if (password.length >= 8) score += 0.5
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[@$!%*?&]/.test(password)) score++
  if (password.length >= 16) score += 0.5
  if (score < 3) return { level: 'weak', score }
  if (score < 5) return { level: 'medium', score }
  return { level: 'strong', score }
}

const STRENGTH_COLORS: Record<PasswordStrength, string> = {
  weak: 'bg-[#EF4444]',
  medium: 'bg-[#F59E42]',
  strong: 'bg-[#10B981]',
}

interface PasswordStrengthMeterProps {
  password: string
  className?: string
}

export function PasswordStrengthMeter({ password, className }: PasswordStrengthMeterProps) {
  const { level } = getPasswordStrength(password)
  if (!password) return null

  const bars = level === 'weak' ? 1 : level === 'medium' ? 2 : 3
  const label = level.charAt(0).toUpperCase() + level.slice(1)

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex gap-1" role="progressbar" aria-valuenow={bars} aria-valuemin={0} aria-valuemax={3}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors duration-200',
              i <= bars ? STRENGTH_COLORS[level] : 'bg-muted'
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
