import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: SelectOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      options,
      value,
      onValueChange,
      placeholder = 'Select...',
      ...props
    },
    ref
  ) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          value={value ?? ''}
          onChange={(e) => onValueChange?.(e.target.value)}
          className={cn(
            'flex h-10 w-full appearance-none rounded-lg border border-input bg-background px-3 py-2 pr-9 text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none text-muted-foreground"
          aria-hidden
        />
      </div>
    )
  }
)
Select.displayName = 'Select'

export { Select }
