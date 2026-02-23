import { Link } from 'react-router-dom'
import { Check, Zap, Building2, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const PLANS = [
  {
    icon: Zap,
    name: 'Free Trial',
    price: '$0',
    period: '14 days',
    features: ['Up to 2 projects', '5 decisions', 'PDF exports', 'Email support'],
    cta: 'Get started free',
    to: '/signup',
    primary: false,
    isContact: false,
  },
  {
    icon: Building2,
    name: 'Studio',
    price: 'Custom',
    period: 'per seat',
    features: ['Unlimited projects', 'Unlimited decisions', 'Branded exports', 'Client links', 'Priority support'],
    cta: 'Get started',
    to: '/signup',
    primary: true,
    isContact: false,
  },
  {
    icon: Briefcase,
    name: 'Enterprise',
    price: 'Custom',
    period: 'contact us',
    features: ['Everything in Studio', 'SSO', 'Custom domain', 'Dedicated support', 'SLA'],
    cta: 'Contact Sales',
    to: null,
    primary: false,
    isContact: true,
  },
]

interface PricingTeaserProps {
  onContactSales?: () => void
}

export function PricingTeaser({ onContactSales }: PricingTeaserProps) {
  return (
    <section id="pricing" className="scroll-mt-20 border-t border-border py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
          Simple, transparent pricing
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          Start free. Scale as you grow. Per-seat plans for teams of any size.
        </p>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                'relative flex flex-col rounded-xl border bg-card p-6 shadow-[0px_2px_8px_rgba(0,0,0,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]',
                plan.primary ? 'border-primary/50 ring-2 ring-primary/20' : 'border-border'
              )}
            >
              <plan.icon className="h-8 w-8 text-primary" aria-hidden />
              <h3 className="mt-4 text-lg font-semibold text-foreground">{plan.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                <span className="text-sm text-muted-foreground">/ {plan.period}</span>
              </div>
              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex-1">
                {plan.isContact && onContactSales ? (
                  <Button
                    variant="outline"
                    className="w-full transition-all hover:scale-[1.02]"
                    onClick={onContactSales}
                  >
                    {plan.cta}
                  </Button>
                ) : plan.to ? (
                  <Link to={plan.to}>
                    <Button
                      className={cn(
                        'w-full transition-all hover:scale-[1.02]',
                        plan.primary && 'bg-primary hover:bg-primary/90'
                      )}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          <Link to="/dashboard/billing" className="text-primary hover:underline">
            Compare plans
          </Link>{' '}
          in your dashboard
        </p>
      </div>
    </section>
  )
}
