import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border px-4 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link to="/" className="text-xl font-bold text-primary">Archject</Link>
          <Link to="/"><Button variant="ghost">Back</Button></Link>
        </div>
      </nav>
      <main className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-4 text-muted-foreground">
          Your privacy is important to us. This policy describes how we collect, use, and protect your information.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Full privacy policy content would be provided by legal counsel. This is a placeholder.
        </p>
        <Link to="/" className="mt-8 inline-block">
          <Button variant="outline">Back to home</Button>
        </Link>
      </main>
    </div>
  )
}
