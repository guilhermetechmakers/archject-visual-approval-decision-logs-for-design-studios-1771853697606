import { Link } from 'react-router-dom'
import { Check, FileCheck, Share2, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <nav className="relative flex items-center justify-between px-4 py-6 lg:px-8">
          <span className="text-xl font-bold text-primary">Archject</span>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link to="/signup">
              <Button>Get started</Button>
            </Link>
          </div>
        </nav>

        <div className="relative mx-auto max-w-6xl px-4 py-24 lg:py-32">
          <div className="animate-in-up mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Visual approval & decision logs for{' '}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                design studios
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              Replace scattered emails and PDFs with a single structured approval layer. Every client decision is presented visually, time-stamped, and stored as an auditable Decision Log.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Start free trial
                </Button>
              </Link>
              <Link to="/about">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  See how it works
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Features - Bento-style grid */}
      <section className="mx-auto max-w-6xl px-4 py-24">
        <h2 className="text-center text-3xl font-bold">Built for design studios</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          Laser focus on approvals—not full PM. Zero-friction client links. Visual-first comparisons. Legal-grade exports.
        </p>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: FileCheck,
              title: 'Decision Cards',
              desc: 'Present options visually with side-by-side comparisons. Clients approve with one tap—no login required.',
              className: 'lg:col-span-2',
            },
            {
              icon: Share2,
              title: 'No-Login Links',
              desc: 'Tokenized share links. Clients approve from any device without creating an account.',
              className: '',
            },
            {
              icon: Download,
              title: 'Exportable Logs',
              desc: 'Generate PDF/CSV Decision Logs with firm branding. Legal-grade audit trails for contracts and permits.',
              className: 'sm:col-span-2',
            },
            {
              icon: Check,
              title: 'Templates',
              desc: 'Opinionated templates for materials, layouts, change requests. Speed onboarding and best practices.',
              className: '',
            },
          ].map((item, i) => (
            <div
              key={item.title}
              className={cn(
                'card-hover rounded-xl border border-border bg-card p-6 shadow-card animate-in-up',
                item.className
              )}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <item.icon className="h-10 w-10 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3-step flow */}
      <section className="border-t border-border bg-secondary/50 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold">Three steps to faster approvals</h2>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              { step: '1', title: 'Create', desc: 'Add options, attach drawings, set reminders.' },
              { step: '2', title: 'Share', desc: 'Send a no-login link. Client approves in seconds.' },
              { step: '3', title: 'Export', desc: 'Download signed Decision Log for your records.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {item.step}
                </div>
                <h3 className="mt-4 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold">Ready to accelerate approvals?</h2>
          <p className="mt-4 text-muted-foreground">
            Join design studios who ship faster with clear, auditable client decisions.
          </p>
          <Link to="/signup" className="mt-8 inline-block">
            <Button size="lg">Get started free</Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <span className="text-sm text-muted-foreground">© Archject. Visual approval for design studios.</span>
          <div className="flex gap-6">
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
              Privacy
            </Link>
            <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground">
              Terms
            </Link>
            <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground">
              About
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
