import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const DEBOUNCE_MS = 300
const PLACEHOLDER = 'Search projects, decisions, clients…'

export interface SearchSuggestion {
  route: string
  label: string
}

const DEFAULT_SUGGESTIONS: SearchSuggestion[] = [
  { route: '/dashboard/overview', label: 'Dashboard' },
  { route: '/dashboard/projects', label: 'Projects' },
  { route: '/dashboard/decisions', label: 'Decisions' },
  { route: '/help', label: 'Help Center' },
]

export interface SearchBoxProps {
  className?: string
  placeholder?: string
  suggestions?: SearchSuggestion[]
  onSearch?: (query: string) => void
  /** If true, Enter routes to Dashboard when no API; otherwise uses onSearch */
  fallbackRoute?: string
}

export function SearchBox({
  className,
  placeholder = PLACEHOLDER,
  suggestions = DEFAULT_SUGGESTIONS,
  onSearch,
  fallbackRoute = '/dashboard/overview',
}: SearchBoxProps) {
  const [value, setValue] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(value.trim()), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [value])

  const filtered =
    debouncedQuery.length >= 2
      ? suggestions.filter(
          (s) =>
            s.label.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
            s.route.toLowerCase().includes(debouncedQuery.toLowerCase())
        )
      : suggestions.slice(0, 5)

  const showSuggestions = isOpen && (value.length > 0 || filtered.length > 0)

  const handleSelect = useCallback(
    (route: string) => {
      navigate(route)
      setIsOpen(false)
      setValue('')
    },
    [navigate]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        inputRef.current?.blur()
      }
      if (e.key === 'Enter') {
        if (filtered.length > 0) {
          handleSelect(filtered[0].route)
        } else {
          onSearch?.(value.trim()) ?? navigate(fallbackRoute)
        }
      }
    },
    [filtered, handleSelect, onSearch, value, navigate, fallbackRoute]
  )

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          ref={inputRef}
          type="search"
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="h-12 rounded-lg border-input pl-10 pr-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Search Archject"
          aria-autocomplete="list"
          aria-controls="search-suggestions-404"
          aria-expanded={showSuggestions}
          role="combobox"
        />
        {value.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
            onClick={() => setValue('')}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showSuggestions && (
        <ul
          id="search-suggestions-404"
          role="listbox"
          className="absolute top-full left-0 right-0 z-50 mt-2 max-h-64 overflow-auto rounded-lg border border-border bg-card py-2 shadow-lg animate-in"
          aria-live="polite"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">No matches. Press Enter to go to Dashboard.</li>
          ) : (
            filtered.map((s) => (
              <li key={s.route} role="option">
                <button
                  type="button"
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => handleSelect(s.route)}
                >
                  {s.label}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
