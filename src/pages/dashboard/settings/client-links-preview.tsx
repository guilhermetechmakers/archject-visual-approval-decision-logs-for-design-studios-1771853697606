import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ExternalLink } from 'lucide-react'
import type { ClientLinkBranding } from '@/types/settings'

interface ClientLinksPreviewProps {
  branding: ClientLinkBranding
  studioName?: string
}

export function ClientLinksPreview({ branding, studioName = 'Your Studio' }: ClientLinksPreviewProps) {
  const colors = branding.colorTokens
  const logoUrl = branding.logoUrl
  const customDomain = branding.customDomain ?? 'app.archject.com'

  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Client Links Preview</CardTitle>
        <CardDescription>
          Live preview of how client-facing links appear with your branding
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="rounded-xl border border-border p-6 transition-colors duration-200"
          style={{
            backgroundColor: colors.background,
            color: colors.text,
          }}
        >
          <div className="flex items-center gap-3 border-b pb-4 mb-4" style={{ borderColor: colors.text + '20' }}>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${studioName} logo`}
                className="h-10 w-auto object-contain"
              />
            ) : (
              <div
                className="h-10 w-24 rounded-lg flex items-center justify-center text-sm font-semibold"
                style={{ backgroundColor: colors.primary, color: '#fff' }}
              >
                {studioName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="font-semibold text-lg" style={{ color: colors.text }}>
              {studioName}
            </span>
          </div>

          <div className="space-y-3">
            <div
              className="rounded-lg px-4 py-3 flex items-center justify-between"
              style={{ backgroundColor: colors.primary + '15', borderLeft: `4px solid ${colors.primary}` }}
            >
              <span className="text-sm font-medium" style={{ color: colors.text }}>
                Decision: Kitchen Finishes
              </span>
              <ExternalLink className="h-4 w-4 opacity-60" style={{ color: colors.accent }} />
            </div>
            <p className="text-xs" style={{ color: colors.text + 'CC' }}>
              {customDomain}/client/abc123
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
