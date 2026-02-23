import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Check, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import type { Decision } from '@/types'

const mockDecision: Decision = {
  id: '1',
  projectId: '1',
  title: 'Kitchen counter material',
  description: 'Please select your preferred counter material for the kitchen island.',
  options: [
    { id: 'opt1', label: 'Quartz - Calacatta', description: 'White with subtle veining' },
    { id: 'opt2', label: 'Granite - Black Galaxy', description: 'Dark with gold flecks' },
    { id: 'opt3', label: 'Marble - Carrara', description: 'Classic white marble' },
  ],
  status: 'pending',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export function ClientPortal() {
  const { token } = useParams<{ token: string }>()
  const { data: decision = mockDecision, isLoading } = useQuery({
    queryKey: ['client-decision', token],
    queryFn: () => api.get<Decision>(`/client/${token}`).catch(() => mockDecision),
    enabled: !!token,
  })

  const handleApprove = (_optionId: string) => {
    // TODO: API call to record approval
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Branded header - mobile-first */}
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <span className="text-lg font-bold text-primary">Archject</span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Secure approval</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-8 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-4 w-full rounded bg-muted animate-pulse" />
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in-up">
            <div>
              <h1 className="text-2xl font-bold">{decision.title}</h1>
              {decision.description && (
                <p className="mt-2 text-muted-foreground">{decision.description}</p>
              )}
            </div>

            {/* Large CTAs - option cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              {decision.options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleApprove(opt.id)}
                  className={`flex flex-col rounded-xl border-2 p-6 text-left transition-all card-hover ${
                    opt.selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="aspect-video rounded-lg bg-muted mb-4 flex items-center justify-center">
                    {opt.imageUrl ? (
                      <img src={opt.imageUrl} alt={opt.label} className="h-full w-full rounded-lg object-cover" />
                    ) : (
                      <span className="text-muted-foreground text-sm">Preview</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{opt.label}</h3>
                      {opt.description && (
                        <p className="text-sm text-muted-foreground">{opt.description}</p>
                      )}
                    </div>
                    {opt.selected ? (
                      <Check className="h-6 w-6 text-primary" />
                    ) : (
                      <Button size="sm">Select</Button>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Comments box */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Questions or comments?</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Add a comment if you need to clarify anything before approving.
                </p>
              </CardHeader>
              <CardContent>
                <textarea
                  className="w-full min-h-[100px] rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Type your comment..."
                />
                <Button className="mt-2" size="sm">Send comment</Button>
              </CardContent>
            </Card>

            {/* Security notice */}
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-4 w-4" />
              Your selection will be time-stamped and recorded. No login required.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
