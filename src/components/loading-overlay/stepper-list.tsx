import * as React from 'react'
import { Check, Circle, Loader2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { JobStep, StepStatus } from '@/types/jobs'

export interface StepperListProps {
  steps: JobStep[]
  currentStep?: string | null
  className?: string
}

const statusConfig: Record<
  StepStatus,
  { icon: React.ElementType; color: string; bgColor: string }
> = {
  pending: {
    icon: Circle,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
  in_progress: {
    icon: Loader2,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
  completed: {
    icon: Check,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  failed: {
    icon: XCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
}

export function StepperList({ steps, currentStep, className }: StepperListProps) {
  if (!steps.length) return null

  return (
    <div className={cn('space-y-3', className)} role="list">
      {steps.map((step) => {
        const config = statusConfig[step.status]
        const Icon = config.icon
        const isActive = step.name === currentStep || step.status === 'in_progress'

        return (
          <div
            key={step.name}
            role="listitem"
            className={cn(
              'flex items-start gap-3 rounded-lg p-3 transition-colors',
              isActive && 'bg-muted/50'
            )}
          >
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                config.bgColor,
                config.color
              )}
            >
              {step.status === 'in_progress' ? (
                <Icon className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Icon className="h-4 w-4" aria-hidden />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'font-medium',
                    step.status === 'completed' && 'text-muted-foreground',
                    step.status === 'failed' && 'text-destructive'
                  )}
                >
                  {step.name}
                </span>
                {step.status === 'completed' && (
                  <span className="sr-only">Completed</span>
                )}
                {step.status === 'in_progress' && (
                  <span className="sr-only">In progress</span>
                )}
                {step.status === 'failed' && (
                  <span className="sr-only">Failed</span>
                )}
              </div>
              {step.detail && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {step.detail}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
