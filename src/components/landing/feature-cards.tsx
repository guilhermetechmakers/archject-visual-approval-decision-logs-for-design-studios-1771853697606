import { Link } from 'react-router-dom'
import {
  FileCheck,
  Share2,
  ClipboardList,
  LayoutTemplate,
  Download,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const FEATURES = [
  {
    icon: FileCheck,
    title: 'Visual Decisions',
    description: 'Present options visually with side-by-side comparisons. Clients approve with one tap—no login required.',
    cta: 'Learn more',
    to: '/help/article/client-link',
    className: 'lg:col-span-2',
    isBrandingPreview: false,
  },
  {
    icon: Share2,
    title: 'Client Link',
    description: 'Tokenized share links. Clients approve from any device without creating an account.',
    cta: 'See branded example',
    to: '/help/article/client-link',
    className: '',
    isBrandingPreview: true,
  },
  {
    icon: ClipboardList,
    title: 'Audit Logs',
    description: 'Every decision is time-stamped and stored. Full audit trail for contracts and permits.',
    cta: 'Explore exports',
    to: '/help/article/decision-logs',
    className: 'sm:col-span-2',
    isBrandingPreview: false,
  },
  {
    icon: LayoutTemplate,
    title: 'Templates',
    description: 'Opinionated templates for materials, layouts, change requests. Speed onboarding and best practices.',
    cta: 'Browse templates',
    to: '/help/article/getting-started',
    className: '',
    isBrandingPreview: false,
  },
  {
    icon: Download,
    title: 'Exports',
    description: 'Generate PDF/CSV Decision Logs with firm branding. Legal-grade audit trails for your records.',
    cta: 'View export options',
    to: '/help/article/exports',
    className: '',
    isBrandingPreview: false,
  },
] as const

interface FeatureCardsProps {
  onBrandingPreview?: () => void
}

export function FeatureCards({ onBrandingPreview }: FeatureCardsProps) {
  return (
    <section id="features" className="scroll-mt-20 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
          Built for design studios
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          Laser focus on approvals—not full PM. Zero-friction client links. Visual-first comparisons. Legal-grade exports.
        </p>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((item, i) =>
            item.isBrandingPreview && onBrandingPreview ? (
              <button
                key={item.title}
                type="button"
                onClick={onBrandingPreview}
                className={cn(
                  'group rounded-xl border border-border bg-card p-6 shadow-[0px_2px_8px_rgba(0,0,0,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:border-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-left',
                  item.className
                )}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <item.icon className="h-10 w-10 text-primary" aria-hidden />
                <h3 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                  {item.cta}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </button>
            ) : (
              <Link
                key={item.title}
                to={item.to}
                className={cn(
                  'group rounded-xl border border-border bg-card p-6 shadow-[0px_2px_8px_rgba(0,0,0,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:border-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  item.className
                )}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <item.icon className="h-10 w-10 text-primary" aria-hidden />
                <h3 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                  {item.cta}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            )
          )}
        </div>
      </div>
    </section>
  )
}
