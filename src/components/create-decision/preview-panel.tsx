import { useState } from 'react'
import { Smartphone, Monitor, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { DraftDecision } from '@/api/decisions-create'

export interface PreviewPanelProps {
  decision: DraftDecision
  clientLink?: string
  onCopyLink?: () => void
  isPublished?: boolean
}

export function PreviewPanel({ decision, clientLink, onCopyLink, isPublished }: PreviewPanelProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')
  const [simulatedApprovedId, setSimulatedApprovedId] = useState<string | null>(null)

  const options = decision.options ?? []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] font-semibold">Preview</h2>
        <p className="mt-1 text-muted-foreground">
          See how the decision will appear to your client
        </p>
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'desktop' | 'mobile')}>
        <TabsList>
          <TabsTrigger value="desktop" className="gap-2">
            <Monitor className="h-4 w-4" />
            Desktop
          </TabsTrigger>
          <TabsTrigger value="mobile" className="gap-2">
            <Smartphone className="h-4 w-4" />
            Mobile
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div
        className={cn(
          'mx-auto rounded-xl border border-border bg-card shadow-card overflow-hidden transition-all duration-300',
          viewMode === 'mobile' ? 'max-w-[375px]' : 'max-w-2xl'
        )}
      >
        <div className="border-b border-border bg-muted/50 px-4 py-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Client view
          </p>
          <h3 className="font-semibold">{decision.title || 'Untitled Decision'}</h3>
          {decision.description && (
            <p className="mt-1 text-sm text-muted-foreground">{decision.description}</p>
          )}
        </div>
        <div className="p-4">
          <div
            className={cn(
              'grid gap-4',
              viewMode === 'mobile' ? 'grid-cols-1' : 'grid-cols-2'
            )}
          >
            {options.map((opt) => {
              const isApproved = simulatedApprovedId === opt.id
              const firstImage = opt.attachments?.find((a) => a.previewUrl)?.previewUrl

              return (
                <div
                  key={opt.id ?? opt.title}
                  className={cn(
                    'relative overflow-hidden rounded-lg border-2 p-4 transition-all cursor-pointer',
                    isApproved
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                  onClick={() => setSimulatedApprovedId(isApproved ? null : (opt.id ?? null))}
                >
                  {isApproved && (
                    <div className="absolute right-2 top-2 rounded-full bg-primary p-1">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                  <div className="aspect-video rounded-md bg-muted flex items-center justify-center overflow-hidden">
                    {firstImage ? (
                      <img
                        src={firstImage}
                        alt={opt.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">No image</span>
                    )}
                  </div>
                  <h4 className="mt-2 font-medium">{opt.title}</h4>
                  {opt.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{opt.description}</p>
                  )}
                  {(opt.isRecommended || opt.isDefault) && (
                    <div className="mt-2 flex gap-2">
                      {opt.isRecommended && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          Recommended
                        </span>
                      )}
                      {opt.isDefault && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          Default
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Click an option to simulate approval
          </p>
        </div>
      </div>

      {isPublished && clientLink && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client share link</CardTitle>
            <CardDescription>Share this link with your client to collect their approval</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input
              readOnly
              value={clientLink}
              className="font-mono text-sm"
            />
            <Button variant="outline" onClick={onCopyLink}>
              Copy link
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
