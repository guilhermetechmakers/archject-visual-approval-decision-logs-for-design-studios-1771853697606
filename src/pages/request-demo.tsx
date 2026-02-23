import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { LandingHeader, DemoRequestForm } from '@/components/landing'

export function RequestDemoPage() {
  const [demoOpen, setDemoOpen] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Request a Demo | Archject'
    return () => {
      document.title = 'Archject - Visual Approval & Decision Logs for Design Studios'
    }
  }, [])

  const handleClose = (open: boolean) => {
    setDemoOpen(open)
    if (!open) {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />

      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-foreground">Request a Demo</h1>
        <p className="mt-4 text-muted-foreground">
          Tell us about your setup and we&apos;ll schedule a walkthrough of Archject.
        </p>
        <Button className="mt-8 transition-all hover:scale-[1.02]" onClick={() => setDemoOpen(true)}>
          Open demo request form
        </Button>
      </main>

      <DemoRequestForm open={demoOpen} onOpenChange={handleClose} />
    </div>
  )
}
