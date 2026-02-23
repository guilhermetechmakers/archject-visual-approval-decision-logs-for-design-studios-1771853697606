import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border px-4 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link to="/" className="text-xl font-bold text-primary">Archject</Link>
          <Link to="/"><Button variant="ghost">Back</Button></Link>
        </div>
      </nav>
      <main className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="mt-4 text-muted-foreground">
          By using Archject, you agree to these terms of service.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Full terms of service content would be provided by legal counsel. This is a placeholder.
        </p>
        <Link to="/" className="mt-8 inline-block">
          <Button variant="outline">Back to home</Button>
        </Link>
      </main>
    </div>
  )
}
