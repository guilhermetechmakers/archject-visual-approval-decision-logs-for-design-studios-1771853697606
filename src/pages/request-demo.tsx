import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ContactForm } from '@/components/help'

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
      <nav className="border-b border-border px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="text-xl font-bold text-primary">
            Archject
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/signup">
              <Button>Sign up</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold">Request a Demo</h1>
        <p className="mt-4 text-muted-foreground">
          Tell us about your setup and we&apos;ll schedule a walkthrough of Archject.
        </p>
        <Button className="mt-8" onClick={() => setDemoOpen(true)}>
          Open demo request form
        </Button>
      </main>

      <ContactForm open={demoOpen} onOpenChange={handleClose} source="demo" />
    </div>
  )
}
