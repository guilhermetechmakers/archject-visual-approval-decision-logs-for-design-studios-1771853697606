import { Check, AlertCircle, Loader2 } from 'lucide-react'
import { MetadataList } from './MetadataList'
import { CTAButton } from './CTAButton'
import { cn } from '@/lib/utils'
import type { MetadataItem } from './MetadataList'
import type { CTAConfig } from '@/types/confirmation'

export type SuccessCardState = 'success' | 'in-progress' | 'error'

export interface SuccessCardProps {
  title: string
  message: string
  iconType?: SuccessCardState
  referenceData?: MetadataItem[]
  primaryCTA: CTAConfig
  secondaryCTAs?: CTAConfig[]
  onCopyReference?: (value: string) => void
  className?: string
}

export function SuccessCard({
  title,
  message,
  iconType = 'success',
  referenceData = [],
  primaryCTA,
  secondaryCTAs = [],
  onCopyReference,
  className,
}: SuccessCardProps) {
  const Icon =
    iconType === 'success'
      ? Check
      : iconType === 'error'
        ? AlertCircle
        : Loader2

  const isInProgress = iconType === 'in-progress'

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'col-span-full rounded-xl border border-[rgb(229,231,235)] bg-[#FFFFFF] p-6 shadow-card transition-all duration-300 sm:col-span-12',
        'hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]',
        className
      )}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
          <div
            className={cn(
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-full',
              iconType === 'success' && 'bg-[rgb(16,185,129)]/10 text-[rgb(16,185,129)]',
              iconType === 'error' && 'bg-destructive/10 text-destructive',
              iconType === 'in-progress' && 'bg-[rgb(0,82,204)]/10 text-[rgb(0,82,204)]'
            )}
          >
            {isInProgress ? (
              <Icon className="h-7 w-7 animate-spin" aria-hidden />
            ) : (
              <Icon className="h-7 w-7" aria-hidden />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-[28px] font-bold tracking-tight text-[rgb(17,24,39)]">
              {title}
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-[rgb(107,114,128)]">
              {message}
            </p>
          </div>
        </div>

        {referenceData.length > 0 && (
          <MetadataList
            items={referenceData.map((r) => ({
              ...r,
              copyable: r.copyable ?? true,
            }))}
            onCopy={onCopyReference}
          />
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <CTAButton
            label={primaryCTA.label}
            onClick={primaryCTA.action}
            variant="primary"
          />
          {secondaryCTAs.map((cta) => (
            <CTAButton
              key={cta.label}
              label={cta.label}
              onClick={cta.action}
              variant="secondary"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
