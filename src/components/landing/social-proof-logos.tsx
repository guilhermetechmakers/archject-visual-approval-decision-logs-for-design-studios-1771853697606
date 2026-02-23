const LOGOS = [
  'Architecture Studio',
  'Design Collective',
  'Interior Design Co',
  'Urban Planning Group',
  'Landscape Architects',
] as const

export function SocialProofLogos() {
  return (
    <section className="border-t border-border py-12">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-center text-sm font-medium text-muted-foreground">
          Trusted by design studios worldwide
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          {LOGOS.map((name) => (
            <div
              key={name}
              className="flex h-10 items-center justify-center rounded-lg px-6 text-sm font-medium text-muted-foreground/70 grayscale"
              aria-hidden
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
