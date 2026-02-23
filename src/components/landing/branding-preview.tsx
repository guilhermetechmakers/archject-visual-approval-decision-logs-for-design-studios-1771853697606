import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Palette, ExternalLink } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { brandingApi, type BrandingPreview } from '@/api/branding'

const DEMO_STUDIO_ID = 'default'

interface BrandingPreviewCalloutProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BrandingPreviewCallout({ open, onOpenChange }: BrandingPreviewCalloutProps) {
  const { isAuthenticated } = useAuth()
  const [data, setData] = useState<BrandingPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    brandingApi
      .getPreview(DEMO_STUDIO_ID)
      .then(setData)
      .catch(() => setError('Could not load preview'))
      .finally(() => setLoading(false))
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        onClose={() => onOpenChange(false)}
        showClose={true}
      >
        <DialogHeader>
          <DialogTitle>Branded client links</DialogTitle>
          <DialogDescription>
            See how your studio branding appears on client-facing approval links.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {data && !loading && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-4">
                {data.logoUrl ? (
                  <img
                    src={data.logoUrl}
                    alt={data.logoAlt}
                    className="h-12 w-auto object-contain"
                  />
                ) : (
                  <div className="flex h-12 w-24 items-center justify-center rounded bg-muted text-sm font-medium text-muted-foreground">
                    {data.name}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-foreground">{data.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className="inline-block h-4 w-4 rounded border border-border"
                      style={{ backgroundColor: data.primaryColor }}
                      aria-hidden
                    />
                    <span className="text-xs text-muted-foreground">{data.primaryColor}</span>
                  </div>
                </div>
              </div>
              {data.customDomain && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Custom domain: {data.customDomain}
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isAuthenticated
                ? 'Configure your branding in Settings → Branding.'
                : 'Sign up to customize your studio branding.'}
            </p>
            <Link
              to={isAuthenticated ? '/dashboard/settings' : '/signup'}
              onClick={() => onOpenChange(false)}
            >
              <Button variant="outline" size="sm" className="w-full">
                <Palette className="h-4 w-4 mr-2" />
                {isAuthenticated ? 'Go to Branding settings' : 'Sign up to customize'}
                <ExternalLink className="h-3 w-3 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
