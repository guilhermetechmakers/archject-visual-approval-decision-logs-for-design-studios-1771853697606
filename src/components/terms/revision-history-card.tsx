import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { TermsVersionSummary } from '@/api/terms'

interface RevisionHistoryCardProps {
  versions: TermsVersionSummary[]
  lastUpdated?: string
  className?: string
}

const MAX_VISIBLE = 5

export function RevisionHistoryCard({ versions, lastUpdated, className }: RevisionHistoryCardProps) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? versions : versions.slice(0, MAX_VISIBLE)
  const hasMore = versions.length > MAX_VISIBLE

  return (
    <Card className={cn('shadow-card', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Revision History</h2>
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">Last updated: {lastUpdated}</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ul aria-label="Terms version history" className="space-y-3">
          {visible.map((v) => (
            <li key={v.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{v.version_number}</span>
                <span className="text-xs text-muted-foreground">{v.effective_date}</span>
                {v.published && (
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: 'rgb(16 185 129 / 0.15)', color: '#10B981' }}
                  >
                    Published
                  </span>
                )}
              </div>
              {v.change_log.length > 0 && (
                <ul className="ml-4 list-disc space-y-0.5 text-xs text-muted-foreground">
                  {v.change_log.map((entry, i) => (
                    <li key={i}>
                      {entry.date}: {entry.note}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-3 flex items-center gap-1 text-sm text-primary hover:underline"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show {versions.length - MAX_VISIBLE} more
              </>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  )
}
