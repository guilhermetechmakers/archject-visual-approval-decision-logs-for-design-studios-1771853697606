import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RichTextViewer, ContactForm } from '@/components/help'
import { useKbArticle } from '@/hooks/use-help'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function HelpArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const [feedback, setFeedback] = useState<'yes' | 'no' | null>(null)
  const [contactOpen, setContactOpen] = useState(false)

  const { data: article, isLoading, error } = useKbArticle(slug)

  if (error) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center">
        <p className="text-destructive">Article not found.</p>
        <Link to="/help">
          <Button variant="outline" className="mt-4">
            Back to Help
          </Button>
        </Link>
      </div>
    )
  }

  if (isLoading || !article) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const headings = extractHeadings(article.body)

  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid gap-8 lg:grid-cols-[1fr_240px]">
        <article className="min-w-0">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">{article.title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Updated {new Date(article.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setContactOpen(true)}
                className="shrink-0"
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                Contact support
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <RichTextViewer content={article.body} />

              {/* Was this helpful? */}
              <div className="border-t border-border pt-6">
                <p className="text-sm font-medium">Was this helpful?</p>
                <div className="mt-2 flex gap-2">
                  <Button
                    variant={feedback === 'yes' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFeedback('yes')}
                  >
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    Yes
                  </Button>
                  <Button
                    variant={feedback === 'no' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFeedback('no')}
                  >
                    <ThumbsDown className="h-4 w-4 mr-1" />
                    No
                  </Button>
                </div>
                {feedback === 'no' && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => setContactOpen(true)}
                      className="text-primary hover:underline"
                    >
                      Contact support
                    </button>{' '}
                    and we&apos;ll help you out.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </article>

        {/* Table of Contents */}
        {headings.length > 0 && (
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <Card>
                <CardHeader className="py-4">
                  <h2 className="text-sm font-semibold">On this page</h2>
                </CardHeader>
                <CardContent className="py-0">
                  <nav className="space-y-1">
                    {headings.map((h) => (
                      <a
                        key={h.id}
                        href={`#${h.id}`}
                        className={cn(
                          'block py-1 text-sm text-muted-foreground hover:text-foreground',
                          h.level === 3 && 'pl-3'
                        )}
                      >
                        {h.text}
                      </a>
                    ))}
                  </nav>
                </CardContent>
              </Card>
            </div>
          </aside>
        )}
      </div>

      <div className="mt-8">
        <Link to="/help">
          <Button variant="ghost">← Back to Help</Button>
        </Link>
      </div>

      <ContactForm open={contactOpen} onOpenChange={setContactOpen} source="help-form" />
    </div>
  )
}

function extractHeadings(markdown: string): { id: string; text: string; level: number }[] {
  const headings: { id: string; text: string; level: number }[] = []
  const lines = markdown.split('\n')
  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/)
    if (match) {
      const level = match[1].length
      const text = match[2].trim()
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      headings.push({ id, text, level })
    }
  }
  return headings
}
