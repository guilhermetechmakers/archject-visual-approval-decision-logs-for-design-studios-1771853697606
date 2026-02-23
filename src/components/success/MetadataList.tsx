import { cn } from '@/lib/utils'

export interface MetadataItem {
  label: string
  value: string
  copyable?: boolean
}

export interface MetadataListProps {
  items: MetadataItem[]
  onCopy?: (value: string) => void
  className?: string
}

export function MetadataList({ items, onCopy, className }: MetadataListProps) {
  const handleCopy = (value: string) => {
    if (onCopy) {
      onCopy(value)
      return
    }
    navigator.clipboard.writeText(value)
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-[rgb(229,231,235)] bg-[rgb(247,247,249)] p-4',
        className
      )}
    >
      <dl className="space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <dt className="text-sm font-medium text-[rgb(107,114,128)]">
              {item.label}
            </dt>
            <dd className="flex items-center gap-2 text-sm font-medium text-[rgb(17,24,39)]">
              <span className="font-mono truncate">{item.value}</span>
              {item.copyable && (
                <button
                  type="button"
                  onClick={() => handleCopy(item.value)}
                  className="shrink-0 rounded p-1 text-[rgb(107,114,128)] transition-colors hover:bg-[rgb(229,231,235)] hover:text-[rgb(17,24,39)] focus:outline-none focus:ring-2 focus:ring-[rgb(0,82,204)] focus:ring-offset-1"
                  title="Copy to clipboard"
                  aria-label={`Copy ${item.label}`}
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
