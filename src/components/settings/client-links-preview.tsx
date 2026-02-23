import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface ClientLinksPreviewProps {
  studioName: string
  logoUrl: string | null
  primaryColor: string
  customDomain?: string
  enabled?: boolean
  className?: string
}

export function ClientLinksPreview({
  studioName,
  logoUrl,
  primaryColor,
  customDomain,
  enabled = true,
  className,
}: ClientLinksPreviewProps) {
  const baseUrl = customDomain
    ? `https://${customDomain.replace(/^https?:\/\//, '')}`
    : 'https://app.archject.com'
  const clientLink = `${baseUrl}/client/abc123`

  return (
    <Card className={cn('card-hover overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Client link preview</CardTitle>
        <CardDescription>
          Live preview of how your client-facing links appear with studio branding
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="rounded-lg border border-border bg-card p-6 shadow-card transition-all duration-200"
          style={
            enabled
              ? {
                  ['--preview-accent' as string]: primaryColor,
                }
              : undefined
          }
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={`${studioName} logo`}
                  className="h-12 w-auto max-w-[120px] object-contain"
                />
              ) : (
                <div
                  className="flex h-12 w-24 items-center justify-center rounded-lg text-sm font-medium text-muted-foreground"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  {studioName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-semibold text-foreground">{studioName}</p>
                <p className="text-xs text-muted-foreground">
                  {enabled ? 'White-labeled' : 'Default branding'}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Sample approval link
              </p>
              <a
                href={clientLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-primary hover:underline"
                style={enabled ? { borderColor: `${primaryColor}40`, color: primaryColor } : undefined}
              >
                {clientLink}
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
