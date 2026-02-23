import { AlertBanner } from '@/components/ui/alert-banner'
import { Button } from '@/components/ui/button'
export interface ValidationError {
  field?: string
  message: string
  step?: number
}

export interface ValidationSummaryProps {
  errors: ValidationError[]
  onRetry?: () => void
  onDiscard?: () => void
  className?: string
}

export function ValidationSummary({
  errors,
  onRetry,
  onDiscard,
  className,
}: ValidationSummaryProps) {
  if (errors.length === 0) return null

  return (
    <AlertBanner variant="error" title="Please fix the following issues" className={className}>
      <ul className="list-inside list-disc space-y-1">
        {errors.map((e, i) => (
          <li key={i}>{e.message}</li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
        {onDiscard && (
          <Button variant="ghost" size="sm" onClick={onDiscard}>
            Discard draft
          </Button>
        )}
      </div>
    </AlertBanner>
  )
}
