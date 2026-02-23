import { cn } from '@/lib/utils'

export interface MetadataItem {
  label: string
  value: string
  copyable?: boolean
}

export interface MetadataListProps {
  items: MetadataItem[]
  className?: string
}

/**
 * Compact list with label/value pairs.
 * Muted label (#6B7280), value (#111827).
 */
export function MetadataList({ items, className }: MetadataListProps) {
  return (
    <dl className={cn('flex flex-col gap-2 sm:gap-3', className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        >
          <dt className="text-sm text-[#6B7280]">{item.label}</dt>
          <dd className="text-sm font-medium text-[#111827] break-all">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
