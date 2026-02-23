import { useState, useCallback, useRef, useEffect } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { searchAutocomplete } from '@/api/search'
import type { SearchContentType } from '@/types/search'

export interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSearch?: (value: string) => void
  placeholder?: string
  contentTypes?: SearchContentType[]
  className?: string
  autoFocus?: boolean
  onSuggestionSelect?: (item: { id: string; type: string; title: string }) => void
}

export function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = 'Search projects, decisions, templates, drawings...',
  contentTypes,
  className,
  autoFocus,
  onSuggestionSelect,
}: SearchBarProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [topHits, setTopHits] = useState<{ id: string; type: string; title: string }[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const fetchSuggestions = useCallback(
    async (q: string) => {
      if (q.length < 1) {
        setSuggestions([])
        setTopHits([])
        return
      }
      setIsLoading(true)
      try {
        const res = await searchAutocomplete(q, contentTypes)
        setSuggestions(res.suggestions)
        setTopHits(res.topHits)
      } catch {
        setSuggestions([])
        setTopHits([])
      } finally {
        setIsLoading(false)
      }
    },
    [contentTypes]
  )

  useEffect(() => {
    const timer = setTimeout(() => fetchSuggestions(value), 250)
    return () => clearTimeout(timer)
  }, [value, fetchSuggestions])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch?.(value)
      setIsOpen(false)
    }
    if (e.key === '/') {
      e.preventDefault()
      ;(e.target as HTMLInputElement).focus()
    }
  }

  const showDropdown = isOpen && (suggestions.length > 0 || topHits.length > 0 || (value.length >= 1 && isLoading))

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      <Search
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="pl-9 pr-4"
        aria-label="Search"
        aria-autocomplete="list"
        aria-controls="search-suggestions"
        aria-expanded={showDropdown}
        autoFocus={autoFocus}
      />
      {showDropdown && (
        <div
          id="search-suggestions"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded-lg border border-border bg-card shadow-card"
        >
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Searching...</div>
          ) : (
            <>
              {topHits.length > 0 && (
                <div className="border-b border-border p-2">
                  <div className="px-2 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Top results
                  </div>
                  {topHits.map((hit) => (
                    <button
                      key={hit.id}
                      type="button"
                      role="option"
                      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none"
                      onClick={() => {
                        onChange(hit.title)
                        onSuggestionSelect?.(hit)
                        setIsOpen(false)
                      }}
                    >
                      <span className="truncate font-medium">{hit.title}</span>
                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        {hit.type}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {suggestions.length > 0 && !topHits.some((h) => h.title === suggestions[0]) && (
                <div className="p-2">
                  <div className="px-2 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Suggestions
                  </div>
                  {suggestions.slice(0, 5).map((s) => (
                    <button
                      key={s}
                      type="button"
                      role="option"
                      className="flex w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none"
                      onClick={() => {
                        onChange(s)
                        setIsOpen(false)
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
