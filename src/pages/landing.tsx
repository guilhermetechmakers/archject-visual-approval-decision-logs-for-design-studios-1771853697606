import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  LandingHeader,
  LandingHero,
  FeatureCards,
  HowItWorks,
  PricingTeaser,
  Testimonials,
  SocialProofLogos,
  LandingFooter,
  DemoRequestForm,
  BrandingPreviewCallout,
} from '@/components/landing'
import { Button } from '@/components/ui/button'

export function LandingPage() {
  const [demoOpen, setDemoOpen] = useState(false)
  const [brandingOpen, setBrandingOpen] = useState(false)

  useEffect(() => {
    document.title = 'Archject - Visual Approval & Decision Logs for Design Studios'
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader onBookDemo={() => setDemoOpen(true)} />

      <main>
        <LandingHero onBookDemo={() => setDemoOpen(true)} />
        <FeatureCards onBrandingPreview={() => setBrandingOpen(true)} />
        <HowItWorks />

        <section className="border-t border-border py-16">
          <div className="mx-auto max-w-6xl px-4 text-center">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              White-label client links
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Your logo, your colors. Client-facing approval links that match your studio branding.
            </p>
            <Button
              variant="outline"
              className="mt-6 transition-all hover:scale-[1.02]"
              onClick={() => setBrandingOpen(true)}
            >
              See branded client link example
            </Button>
          </div>
        </section>

        <PricingTeaser onContactSales={() => setDemoOpen(true)} />
        <Testimonials />
        <SocialProofLogos />

        <section className="border-t border-border py-16">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              Ready to accelerate approvals?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Join design studios who ship faster with clear, auditable client decisions.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/signup">
                <Button size="lg" className="w-full sm:w-auto transition-all hover:scale-[1.02] bg-[#0052CC] hover:bg-[#0052CC]/90">
                  Sign up
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto transition-all hover:scale-[1.02]"
                onClick={() => setDemoOpen(true)}
              >
                Request a demo
              </Button>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />

      <DemoRequestForm open={demoOpen} onOpenChange={setDemoOpen} />
      <BrandingPreviewCallout open={brandingOpen} onOpenChange={setBrandingOpen} />
    </div>
  )
}
