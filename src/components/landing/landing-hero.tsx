import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

interface LandingHeroProps {
  onBookDemo?: () => void
}

export function LandingHero({ onBookDemo }: LandingHeroProps) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />

      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">
          <div className="animate-in-up">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl xl:text-[3.5rem]">
              Visual approval & decision logs for{' '}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                design studios
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl" style={{ lineHeight: 1.6 }}>
              Replace scattered emails and PDFs with a single structured approval layer. Every client decision is presented visually, time-stamped, and stored as an auditable Decision Log.
            </p>
            <ul className="mt-6 space-y-3 text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                Side-by-side option reviews on any device
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                No-login client links — approve in seconds
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                Legal-grade PDF exports with your branding
              </li>
            </ul>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link to="/signup">
                <Button size="lg" className="w-full sm:w-auto min-w-[160px] transition-all hover:scale-[1.02] hover:shadow-lg">
                  Get Started
                </Button>
              </Link>
              {onBookDemo && (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto min-w-[160px] transition-all hover:scale-[1.02]"
                  onClick={onBookDemo}
                >
                  Book Demo
                </Button>
              )}
            </div>
          </div>

          <div className="relative animate-in-up animate-stagger-2">
            <div
              className="aspect-[4/3] rounded-xl border border-border bg-card shadow-[0px_2px_8px_rgba(0,0,0,0.03)] overflow-hidden"
              style={{ boxShadow: '0px 2px 8px rgba(0,0,0,0.03)' }}
            >
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted to-muted/50 p-8">
                <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                  <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                    <div className="h-20 rounded bg-muted" />
                    <p className="mt-2 text-xs font-medium text-muted-foreground">Option A</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                    <div className="h-20 rounded bg-muted" />
                    <p className="mt-2 text-xs font-medium text-muted-foreground">Option B</p>
                  </div>
                  <p className="col-span-2 text-center text-sm text-muted-foreground">
                    Side-by-side approval flow
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
