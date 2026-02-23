import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border px-4 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link to="/" className="text-xl font-bold text-primary">Archject</Link>
          <div className="flex gap-4">
            <Link to="/help"><Button variant="ghost">Help</Button></Link>
            <Link to="/login"><Button variant="ghost">Log in</Button></Link>
            <Link to="/signup"><Button>Sign up</Button></Link>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-3xl font-bold">About Archject</h1>
        <p className="mt-4 text-muted-foreground">
          Archject is a lightweight, visual approval system for architecture firms, interior designers, and design studios.
        </p>
        <p className="mt-4 text-muted-foreground">
          We replace scattered emails, chats, and PDFs with a single structured approval layer. Every client decision is presented visually, time-stamped, and stored as an auditable Decision Log.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Our mission</h2>
        <p className="mt-2 text-muted-foreground">
          To help design teams ship faster by making client approvals simple, visual, and legally defensible.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Help & Documentation</h2>
        <p className="mt-2 text-muted-foreground">
          Find guides, FAQs, getting started checklist, and contact support.
        </p>
        <Card className="mt-4">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <Link to="/help">
                <Button>Browse Help & Docs</Button>
              </Link>
              <Link to="/">
                <Button variant="outline">Back to home</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
