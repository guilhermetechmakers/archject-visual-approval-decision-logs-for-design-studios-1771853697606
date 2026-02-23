import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, Mail, HelpCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import {
  SearchBar,
  Checklist,
  ContactForm,
  ArticleListItem,
  HelpFilters,
} from '@/components/help'
import { useKbArticles, useFeaturedArticles, useChecklist } from '@/hooks/use-help'
import { getUserIdFromToken } from '@/lib/auth-utils'
import { FAQ_ITEMS } from '@/data/faq'

export function HelpPage() {
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sort, setSort] = useState('updated_at')
  const sortDir = 'desc'
  const [page, setPage] = useState(1)
  const [contactOpen, setContactOpen] = useState(false)
  const [contactSource, setContactSource] = useState<'help-form' | 'demo'>('help-form')

  const tagsParam = selectedTags.length > 0 ? selectedTags.join(',') : undefined

  const userId = getUserIdFromToken()
  const { data: articlesData, isLoading } = useKbArticles({
    tags: tagsParam,
    page,
    limit: 12,
    sort,
    sortDir,
  })

  const { data: featuredData } = useFeaturedArticles()
  const { data: checklistData } = useChecklist({ userId: userId ?? undefined, teamId: 'default' })

  const articles = articlesData?.articles ?? []
  const total = articlesData?.total ?? 0
  const totalPages = Math.ceil(total / 12) || 1
  const featuredArticles = featuredData?.articles ?? []
  const checklistSteps = checklistData?.steps ?? []
  const checklistProgress = checklistData?.progress ?? 0

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
    setPage(1)
  }

  const faqByCategory = FAQ_ITEMS.reduce<Record<string, typeof FAQ_ITEMS>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-in">
      {/* Hero search */}
      <section>
        <h1 className="text-2xl font-bold">Help Center</h1>
        <p className="mt-1 text-muted-foreground">
          Search docs, FAQs, and guides. Can&apos;t find what you need?{' '}
          <button
            type="button"
            onClick={() => {
            setContactSource('help-form')
            setContactOpen(true)
          }}
            className="text-primary hover:underline"
          >
            Contact support
          </button>
        </p>
        <div className="mt-6">
          <SearchBar placeholder="Search docs, FAQs, and guides..." className="max-w-2xl" />
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        {/* Left column: Checklist + Quick links */}
        <aside className="space-y-6">
          <Checklist
            steps={checklistSteps}
            progress={checklistProgress}
            teamId="default"
            userId={userId ?? undefined}
            isLoading={!checklistData}
          />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quick links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setContactSource('help-form')
                  setContactOpen(true)
                }}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Contact support
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setContactSource('demo')
                  setContactOpen(true)
                }}
              >
                <Mail className="h-4 w-4 mr-2" />
                Request demo
              </Button>
              <Link to="/about">
                <Button variant="outline" className="w-full justify-start">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  About Archject
                </Button>
              </Link>
            </CardContent>
          </Card>
        </aside>

        {/* Main column: Filters + Articles + FAQ */}
        <div className="space-y-8">
          <section>
            <HelpFilters
              selectedTags={selectedTags}
              onTagToggle={handleTagToggle}
              sort={sort}
              onSortChange={setSort}
            />
            {featuredArticles.length > 0 && (
              <div className="mt-6">
                <h2 className="text-lg font-semibold mb-4">Featured articles</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {featuredArticles.map((a) => (
                    <ArticleListItem key={a.id} article={a} />
                  ))}
                </div>
              </div>
            )}
            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-4">All articles</h2>
              {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 rounded-xl border border-border bg-card skeleton" />
                  ))}
                </div>
              ) : articles.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <HelpCircle className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 font-medium">No articles found</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Try adjusting your search or filters.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {articles.map((a) => (
                      <ArticleListItem key={a.id} article={a} />
                    ))}
                  </div>
                  {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page <= 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page >= totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Frequently asked questions</h2>
            <Accordion defaultValue={FAQ_ITEMS[0]?.id}>
              {Object.entries(faqByCategory).map(([category, items]) => (
                <div key={category} className="mb-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">{category}</h3>
                  {items.map((item) => (
                    <AccordionItem key={item.id} value={item.id} className="mb-2">
                      <AccordionTrigger value={item.id}>{item.question}</AccordionTrigger>
                      <AccordionContent value={item.id}>
                        <p>{item.answer}</p>
                        {item.docSlug && (
                          <Link
                            to={`/help/article/${item.docSlug}`}
                            className="mt-2 inline-block text-sm text-primary hover:underline"
                          >
                            Read more →
                          </Link>
                        )}
                        <p className="mt-2">
                          <button
                            type="button"
                            onClick={() => {
                            setContactSource('help-form')
                            setContactOpen(true)
                          }}
                            className="text-sm text-primary hover:underline"
                          >
                            Contact support
                          </button>{' '}
                          if unresolved.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </div>
              ))}
            </Accordion>
          </section>
        </div>
      </div>

      <ContactForm open={contactOpen} onOpenChange={setContactOpen} source={contactSource} />
    </div>
  )
}
