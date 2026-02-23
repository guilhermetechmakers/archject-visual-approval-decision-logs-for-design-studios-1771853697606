import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search as SearchIcon, LayoutGrid, List } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  SearchBar,
  SearchFiltersPanel,
  SearchResultCard,
  SavedSearchesPanel,
  AttachSearchResultDrawer,
} from '@/components/search'
import {
  searchQuery,
  saveSearch,
  getSavedSearches,
} from '@/api/search'
import type {
  SearchQueryPayload,
  SearchFilters,
  SearchResultItem,
  SearchContentType,
  SavedSearch,
} from '@/types/search'
import { toast } from 'sonner'

const CONTENT_TYPE_TABS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'project', label: 'Projects' },
  { value: 'decision', label: 'Decisions' },
  { value: 'template', label: 'Templates' },
  { value: 'file', label: 'Drawings & Specs' },
]

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const initialQuery = searchParams.get('q') ?? ''
  const [query, setQuery] = useState(initialQuery)
  const [contentType, setContentType] = useState<string>(() => {
    const t = searchParams.get('type')
    return t && ['project', 'decision', 'template', 'file'].includes(t) ? t : 'all'
  })
  const [filters, setFilters] = useState<SearchFilters>({})
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [attachItem, setAttachItem] = useState<SearchResultItem | null>(null)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [saveName, setSaveName] = useState('')

  const debouncedQuery = useDebounce(query, 280)

  const contentTypes: SearchContentType[] | undefined =
    contentType === 'all' ? undefined : [contentType as SearchContentType]

  const payload: SearchQueryPayload = {
    query: debouncedQuery || undefined,
    filters: {
      ...filters,
      content_types: contentTypes ?? filters.content_types,
    },
    page,
    pageSize: 12,
    sort: { field: 'updated_at', order: 'desc' },
  }

  const hasFilters =
    (filters.content_types?.length ?? 0) > 0 ||
    (filters.status?.length ?? 0) > 0 ||
    (filters.projects?.length ?? 0) > 0 ||
    (filters.tags?.length ?? 0) > 0 ||
    (filters.dateRange?.from != null || filters.dateRange?.to != null)
  const hasContentFilter = contentType !== 'all'

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['search', payload],
    queryFn: () => searchQuery(payload),
    enabled: debouncedQuery.length >= 2 || hasFilters || hasContentFilter,
  })

  const { data: savedData } = useQuery({
    queryKey: ['search-saved'],
    queryFn: getSavedSearches,
  })
  const savedSearches: SavedSearch[] = savedData?.items ?? []

  const saveMutation = useMutation({
    mutationFn: (name: string) => saveSearch(name, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-saved'] })
      toast.success('Search saved')
      setSaveModalOpen(false)
      setSaveName('')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to save'),
  })

  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    if (query) params.set('q', query)
    else params.delete('q')
    if (contentType !== 'all') params.set('type', contentType)
    else params.delete('type')
    setSearchParams(params, { replace: true })
  }, [query, contentType, searchParams, setSearchParams])

  const handleFiltersChange = useCallback((next: SearchFilters) => {
    setFilters(next)
    setPage(1)
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilters({})
    setPage(1)
  }, [])

  const handleSavedSelect = useCallback((p: SearchQueryPayload) => {
    setQuery(p.query ?? '')
    setFilters(p.filters ?? {})
    setPage(p.page ?? 1)
    if (p.filters?.content_types?.[0]) {
      setContentType(p.filters.content_types[0])
    }
  }, [])

  const results = data?.results ?? []
  const total = data?.total ?? 0
  const pageSize = data?.pageSize ?? 12
  const totalPages = Math.ceil(total / pageSize) || 1

  const hasQueryOrFilters = debouncedQuery.length >= 2 || hasFilters || hasContentFilter

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold">Search</h1>
        <p className="mt-1 text-muted-foreground">
          Find projects, decisions, templates, and drawings across your workspace
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex-1 space-y-4">
          <SearchBar
            value={query}
            onChange={setQuery}
            onSearch={() => setPage(1)}
            contentTypes={contentTypes}
            placeholder="Search projects, decisions, templates, drawings... (min 2 characters)"
            className="w-full"
          />

          <Tabs value={contentType} onValueChange={setContentType}>
            <TabsList>
              {CONTENT_TYPE_TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <SearchFiltersPanel
            filters={filters}
            onChange={handleFiltersChange}
            onClear={handleClearFilters}
          />

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {hasQueryOrFilters
                ? `${total} result${total !== 1 ? 's' : ''}`
                : 'Enter a search query (min 2 characters) or apply filters'}
            </p>
            {results.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {isLoading || isFetching ? (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
                  : 'flex flex-col gap-4'
              }
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 py-16 text-center">
              <SearchIcon className="h-12 w-12 text-muted-foreground" aria-hidden />
              <p className="mt-4 font-medium text-foreground">No results found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a different search term or adjust your filters
              </p>
            </div>
          ) : (
            <>
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
                    : 'flex flex-col gap-4'
                }
              >
                {results.map((item) => (
                  <SearchResultCard
                    key={`${item.type}-${item.id}`}
                    item={item}
                    onAttach={
                      item.type === 'file' || item.type === 'template'
                        ? (i) => setAttachItem(i)
                        : undefined
                    }
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <aside className="w-full lg:w-64 lg:shrink-0">
          <SavedSearchesPanel
            items={savedSearches}
            onSelect={handleSavedSelect}
            onSaveCurrent={
              hasQueryOrFilters
                ? () => {
                    setSaveModalOpen(true)
                  }
                : undefined
            }
            canSave={hasQueryOrFilters}
          />
        </aside>
      </div>

      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-card">
            <h3 className="text-lg font-semibold">Save search</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Give this search a name to quickly recall it later
            </p>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="e.g. Pending approvals"
              className="mt-4 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label="Search name"
            />
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setSaveModalOpen(false)
                  setSaveName('')
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => saveMutation.mutate(saveName.trim() || 'Saved search')}
                disabled={!saveName.trim() || saveMutation.isPending}
              >
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <AttachSearchResultDrawer
        open={!!attachItem}
        onOpenChange={(open) => !open && setAttachItem(null)}
        item={attachItem}
      />
    </div>
  )
}
