import { Link } from 'react-router-dom'
import { PenLine, Share2, FileCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

const STEPS = [
  {
    step: '1',
    icon: PenLine,
    title: 'Create Decision',
    description: 'Add options, attach drawings, set reminders. Present choices visually for your client.',
  },
  {
    step: '2',
    icon: Share2,
    title: 'Share Link',
    description: 'Send a no-login link. Client approves in seconds from any device—no account needed.',
  },
  {
    step: '3',
    icon: FileCheck,
    title: 'Get Approval & Export',
    description: 'Download signed Decision Log for your records. Legal-grade audit trail with your branding.',
  },
] as const

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-t border-border bg-secondary/30 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
          Three steps to faster approvals
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          From creation to export in minutes. No complex setup.
        </p>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {STEPS.map((item, i) => (
            <div key={item.step} className="relative">
              {i < STEPS.length - 1 && (
                <div
                  className="absolute left-[calc(50%+2rem)] top-7 hidden h-0.5 w-[calc(100%-4rem)] border-t-2 border-dashed border-border md:block"
                  aria-hidden
                />
              )}
              <div className="relative flex flex-col items-center text-center">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground shadow-md"
                  aria-hidden
                >
                  {item.step}
                </div>
                <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-[0px_2px_8px_rgba(0,0,0,0.03)] w-full transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
                  <item.icon className="mx-auto h-8 w-8 text-primary" aria-hidden />
                  <h3 className="mt-4 font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Link to="/signup">
            <Button size="lg" className="transition-all hover:scale-[1.02]">
              Start free trial
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
