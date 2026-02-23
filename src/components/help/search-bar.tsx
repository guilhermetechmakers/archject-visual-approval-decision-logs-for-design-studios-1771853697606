import { useState, useCallback, useRef, useEffect } from 'react'
import { Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { helpApi, type KbArticle } from '@/api/help'

const DEBOUNCE_MS = 300

interface SearchBarProps {
  placeholder?: string
  className?: string
  onSelect?: (article: KbArticle) => void
}

export function SearchBar({ placeholder = 'Search docs, FAQs, and guides...', className, onSelect }: SearchBarProps) {
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

  const { data, isLoading } = useQuery({
    queryKey: ['help', 'kb', 'search', debouncedQuery],
    queryFn: () => helpApi.getArticles({ query: debouncedQuery, limit: 8 }),
    enabled: debouncedQuery.length >= 2,
  })

  const articles = data?.articles ?? []
  const showSuggestions = isOpen && (debouncedQuery.length >= 2 || articles.length > 0)

  const handleSelect = useCallback(
    (article: KbArticle) => {
      onSelect?.(article)
      navigate(`/help/article/${article.slug}`)
      setIsOpen(false)
      setValue('')
    },
    [navigate, onSelect]
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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        inputRef.current?.blur()
      }
    },
    []
  )

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
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-9 h-12 rounded-xl border-border"
          aria-label="Search documentation"
          aria-autocomplete="list"
          aria-controls="search-suggestions"
          aria-expanded={showSuggestions}
          role="combobox"
        />
      </div>

      {showSuggestions && (
        <ul
          id="search-suggestions"
          role="listbox"
          className="absolute top-full left-0 right-0 z-50 mt-2 max-h-80 overflow-auto rounded-xl border border-border bg-card py-2 shadow-lg animate-in"
        >
          {isLoading ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">Searching...</li>
          ) : articles.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">
              {debouncedQuery.length >= 2 ? 'No articles found' : 'Type to search'}
            </li>
          ) : (
            articles.map((article) => (
              <li key={article.id} role="option">
                <button
                  type="button"
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => handleSelect(article)}
                >
                  <span className="font-medium">{article.title}</span>
                  {article.excerpt && (
                    <span className="ml-2 text-muted-foreground line-clamp-1">{article.excerpt}</span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
