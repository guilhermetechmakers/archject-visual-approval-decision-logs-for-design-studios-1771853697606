import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

interface HeroProps {
  onBookDemo?: () => void
}

export function Hero({ onBookDemo }: HeroProps) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">
          <div className="animate-in-up">
            <h1 className="text-4xl font-bold tracking-tight text-[#111827] sm:text-5xl lg:text-6xl">
              Visual approval & decision logs for{' '}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                design studios
              </span>
            </h1>
            <p className="mt-6 text-lg text-[#6B7280] sm:text-xl leading-relaxed">
              Replace scattered emails and PDFs with a single structured approval layer. Every client decision is
              presented visually, time-stamped, and stored as an auditable Decision Log.
            </p>
            <ul className="mt-6 space-y-3 text-[#6B7280]">
              {[
                'Side-by-side option reviews — no login required for clients',
                'Tokenized share links — approve from any device',
                'Legal-grade PDF/CSV exports with your branding',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link to="/signup" onClick={() => trackCta('hero_get_started')}>
                <Button size="lg" className="w-full sm:w-auto bg-[#0052CC] hover:bg-[#0052CC]/90 hover:shadow-lg transition-all">
                  Get Started
                </Button>
              </Link>
              {onBookDemo ? (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={onBookDemo}
                >
                  Book Demo
                </Button>
              ) : (
                <Link to="/request-demo" onClick={() => trackCta('hero_book_demo')}>
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Book Demo
                  </Button>
                </Link>
              )}
            </div>
          </div>
          <div className="relative animate-in-up animate-stagger-2">
            <div className="aspect-[4/3] rounded-xl border border-border bg-muted/50 shadow-[0px_2px_8px_rgba(0,0,0,0.03)] overflow-hidden">
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-8">
                <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-lg bg-card border border-border shadow-card animate-pulse"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function trackCta(label: string) {
  if (typeof window !== 'undefined' && 'gtag' in window) {
    ;(window as { gtag?: (a: string, b: string, c: Record<string, string>) => void }).gtag?.(
      'event',
      'click',
      { event_category: 'CTA', event_label: label }
    )
  }
}
