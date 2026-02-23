import { Quote } from 'lucide-react'

const TESTIMONIALS = [
  {
    quote: 'Archject cut our approval cycles in half. Clients love the no-login flow—no more chasing PDFs.',
    name: 'Sarah Chen',
    role: 'Principal, Chen Design Studio',
    avatar: null,
  },
  {
    quote: 'Finally, a tool that understands design studios. The Decision Log exports are exactly what we need for permits.',
    name: 'Marcus Webb',
    role: 'Project Director, Webb Architects',
    avatar: null,
  },
] as const

export function Testimonials() {
  return (
    <section className="border-t border-border py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
          Trusted by design studios
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          Join teams who ship faster with clear, auditable client decisions.
        </p>

        <div className="mt-16 grid gap-8 md:grid-cols-2">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="rounded-xl border border-border bg-card p-6 shadow-[0px_2px_8px_rgba(0,0,0,0.03)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
            >
              <Quote className="h-8 w-8 text-primary/40" aria-hidden />
              <blockquote className="mt-4 text-lg text-foreground" style={{ lineHeight: 1.6 }}>
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div className="mt-6 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{t.name}</p>
                  <p className="text-sm text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
