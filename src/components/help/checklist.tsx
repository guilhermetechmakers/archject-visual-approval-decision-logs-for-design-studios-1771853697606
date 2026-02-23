import { Link } from 'react-router-dom'
import { Check, Circle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import type { ChecklistStep } from '@/api/help'
import { useUpdateChecklistStep } from '@/hooks/use-help'

interface ChecklistProps {
  steps: ChecklistStep[]
  progress: number
  teamId?: string
  userId?: string
  isLoading?: boolean
}

const statusLabels: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
}

const statusVariants: Record<string, 'secondary' | 'warning' | 'success'> = {
  not_started: 'secondary',
  in_progress: 'warning',
  completed: 'success',
}

export function Checklist({ steps, progress, teamId, userId, isLoading }: ChecklistProps) {
  const updateStep = useUpdateChecklistStep({ teamId, userId })

  const handleToggle = (stepKey: string, currentStatus: string) => {
    const nextStatus =
      currentStatus === 'completed' ? 'in_progress' : currentStatus === 'in_progress' ? 'completed' : 'in_progress'
    updateStep.mutate({ stepKey, status: nextStatus as 'not_started' | 'in_progress' | 'completed' })
  }

  if (steps.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Getting Started</CardTitle>
        <div className="flex items-center gap-2">
          <Progress value={progress} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground">{progress}%</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          steps.map((step) => (
            <div
              key={step.stepKey}
              className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/30"
            >
              <button
                type="button"
                onClick={() => handleToggle(step.stepKey, step.status)}
                disabled={updateStep.isPending}
                className="mt-0.5 shrink-0 rounded-full p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Mark ${step.title} as ${step.status === 'completed' ? 'in progress' : 'completed'}`}
              >
                {step.status === 'completed' ? (
                  <Check className="h-5 w-5 text-success" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-sm">{step.title}</span>
                  <Badge variant={statusVariants[step.status]} className="text-xs">
                    {statusLabels[step.status]}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
                {step.docSlug && (
                  <Link
                    to={`/help/article/${step.docSlug}`}
                    className="mt-1 inline-block text-xs text-primary hover:underline"
                  >
                    Read guide →
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
