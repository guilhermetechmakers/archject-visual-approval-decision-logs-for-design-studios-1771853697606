import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  TermsToc,
  TermsContent,
  RevisionHistoryCard,
  AcceptButton,
  parseTocFromMarkdown,
} from '@/components/terms'
import { useActiveTerms, useTermsVersions } from '@/hooks/use-terms'

export function TermsPage() {
  const { data: terms, isLoading, error } = useActiveTerms()
  const { data: versions } = useTermsVersions()

  useEffect(() => {
    document.title = 'Terms of Service | Archject'
    return () => {
      document.title = 'Archject - Visual Approval & Decision Logs for Design Studios'
    }
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F7F9]">
        <nav className="border-b border-border bg-card px-4 py-4">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <Link to="/" className="text-xl font-bold text-primary">
              Archject
            </Link>
            <Link to="/">
              <Button variant="ghost">Back</Button>
            </Link>
          </div>
        </nav>
        <main className="mx-auto max-w-[900px] px-4 py-16">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 rounded bg-muted" />
            <div className="h-4 w-96 rounded bg-muted" />
            <div className="mt-12 h-64 rounded-lg bg-muted" />
          </div>
        </main>
      </div>
    )
  }

  if (error || !terms) {
    return (
      <div className="min-h-screen bg-[#F7F7F9]">
        <nav className="border-b border-border bg-card px-4 py-4">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <Link to="/" className="text-xl font-bold text-primary">
              Archject
            </Link>
            <Link to="/">
              <Button variant="ghost">Back</Button>
            </Link>
          </div>
        </nav>
        <main className="mx-auto max-w-[900px] px-4 py-16 text-center">
          <p className="text-muted-foreground">Unable to load Terms of Service. Please try again later.</p>
          <Link to="/" className="mt-4 inline-block">
            <Button variant="outline">Back to home</Button>
          </Link>
        </main>
      </div>
    )
  }

  const tocItems = parseTocFromMarkdown(terms.content_markdown)

  return (
    <div className="min-h-screen bg-[#F7F7F9]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      <nav className="border-b border-border bg-card px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="text-xl font-bold text-primary">
            Archject
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/privacy">
              <Button variant="ghost">Privacy</Button>
            </Link>
            <Link to="/signup">
              <Button>Sign up</Button>
            </Link>
            <Link to="/">
              <Button variant="ghost">Back</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main id="main-content" className="mx-auto max-w-[900px] px-4 py-16 lg:px-8">
        <div className="animate-in-up">
          <h1 className="text-[28px] font-semibold tracking-tight text-[#111827] sm:text-3xl">
            Terms of Service
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-[#6B7280]">
            Effective date: {terms.effective_date}. These terms govern your use of Archject.
          </p>
          <p className="mt-2 text-sm text-[#6B7280]">
            If you have questions, contact{' '}
            <a href="mailto:legal@archject.com" className="text-[#0052CC] hover:underline">
              legal@archject.com
            </a>
          </p>
        </div>

        <div className="mt-12 flex flex-col gap-12 lg:flex-row">
          <TermsToc items={tocItems} />

          <div className="min-w-0 flex-1">
            <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-[0px_2px_8px_rgba(0,0,0,0.03)]">
              <CardContent className="p-6 lg:p-8">
                <TermsContent content={terms.content_markdown} />
                <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-border pt-8">
                  <AcceptButton versionId={terms.id} />
                  <Link to="/privacy" className="text-sm text-[#0052CC] hover:underline">
                    Privacy Policy
                  </Link>
                  <a href="mailto:legal@archject.com" className="text-sm text-[#0052CC] hover:underline">
                    Contact
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>

          <RevisionHistoryCard versions={versions ?? []} lastUpdated={terms?.effective_date} />
        </div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <span className="text-sm text-muted-foreground">© Archject. Visual approval for design studios.</span>
          <div className="flex gap-6">
            <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground">
              Terms of Service
            </Link>
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
              Privacy Policy
            </Link>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
              Home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
