import { Link } from 'react-router-dom'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

interface SignupConsentProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  error?: string
  disabled?: boolean
  className?: string
}

export function SignupConsent({ checked, onCheckedChange, error, disabled, className }: SignupConsentProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-start gap-3">
        <Checkbox
          id="terms-consent"
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? 'terms-consent-error' : undefined}
          className="mt-0.5"
        />
        <label htmlFor="terms-consent" className="text-sm leading-relaxed cursor-pointer">
          I have read and agree to the{' '}
          <Link
            to="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            Terms of Service
          </Link>
        </label>
      </div>
      {error && (
        <p id="terms-consent-error" className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
