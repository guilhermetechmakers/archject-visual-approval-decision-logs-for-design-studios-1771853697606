import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { LandingHeader, DemoRequestForm } from '@/components/landing'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useState, useEffect } from 'react'

interface Tier {
  name: string
  price: string
  period: string
  bullets: string[]
  cta: string
  href?: string
  primary: boolean
  isContact?: boolean
}

const TIERS: Tier[] = [
  {
    name: 'Free Trial',
    price: 'Free',
    period: '14 days',
    bullets: ['Up to 3 projects', '5 decisions', 'PDF exports', 'Email support'],
    cta: 'Get started free',
    href: '/signup',
    primary: false,
  },
  {
    name: 'Studio',
    price: '$29',
    period: '/seat/month',
    bullets: ['Unlimited projects', 'Unlimited decisions', 'Branded client links', 'Priority support'],
    cta: 'Start free trial',
    href: '/signup',
    primary: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    bullets: ['Custom branding', 'SSO & SAML', 'Dedicated support', 'SLA guarantee'],
    cta: 'Contact Sales',
    primary: false,
    isContact: true,
  },
]

export function PricingPage() {
  const [demoOpen, setDemoOpen] = useState(false)

  useEffect(() => {
    document.title = 'Pricing | Archject'
    return () => {
      document.title = 'Archject - Visual Approval & Decision Logs for Design Studios'
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />

      <main className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-[#111827]">Simple, transparent pricing</h1>
          <p className="mx-auto mt-4 max-w-2xl text-[#6B7280]">
            Start free. Scale as you grow. Per-seat plans for teams of any size.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {TIERS.map((tier) => (
            <Card
              key={tier.name}
              className={`rounded-xl border shadow-[0px_2px_8px_rgba(0,0,0,0.03)] transition-all duration-200 hover:shadow-[0px_4px_12px_rgba(0,0,0,0.08)] ${
                tier.primary ? 'ring-2 ring-primary' : ''
              }`}
            >
              <CardHeader>
                <h2 className="text-lg font-semibold text-[#111827]">{tier.name}</h2>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-[#111827]">{tier.price}</span>
                  {tier.period && <span className="text-muted-foreground">{tier.period}</span>}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {tier.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm text-[#6B7280]">
                      <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      {b}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  {tier.isContact ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setDemoOpen(true)}
                    >
                      {tier.cta}
                    </Button>
                  ) : tier.href ? (
                    <Link to={tier.href}>
                      <Button
                        variant={tier.primary ? 'default' : 'outline'}
                        className={`w-full ${tier.primary ? 'bg-primary hover:bg-primary/90' : ''}`}
                      >
                        {tier.cta}
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-[#6B7280]">Already have an account?</p>
          <Link to="/auth" className="mt-2 inline-block text-primary hover:underline font-medium">
            Log in
          </Link>
        </div>
      </main>

      <DemoRequestForm open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  )
}
