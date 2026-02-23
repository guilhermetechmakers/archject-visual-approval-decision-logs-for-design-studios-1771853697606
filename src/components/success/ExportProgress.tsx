import { Loader2 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export interface ExportProgressProps {
  percent?: number
  message?: string
  isIndeterminate?: boolean
  className?: string
}

export function ExportProgress({
  percent = 0,
  message = 'Preparing export…',
  isIndeterminate = false,
  className,
}: ExportProgressProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-[rgb(229,231,235)] bg-[#FFFFFF] p-4',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[rgb(0,82,204)]/10">
          <Loader2 className="h-5 w-5 animate-spin text-[rgb(0,82,204)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[rgb(17,24,39)]">{message}</p>
          {isIndeterminate ? (
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[rgb(229,231,235)]">
              <div
                className="h-full animate-pulse bg-[rgb(0,82,204)]"
                style={{ width: '40%' }}
              />
            </div>
          ) : (
            <Progress value={percent} className="mt-2 h-2" />
          )}
        </div>
      </div>
    </div>
  )
}
