import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Upload, ImageIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { getStudio, updateStudio, uploadLogo } from '@/api/studios'
import { ClientLinksPreview } from '@/components/settings/client-links-preview'
const schema = z.object({
  studioName: z.string().min(1, 'Studio name is required').max(200, 'Max 200 characters'),
  brandColor: z.string().min(1).max(32),
})

type FormData = z.infer<typeof schema>

const MAX_LOGO_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']

export function BrandingPanel() {
  const queryClient = useQueryClient()
  const [logoUploading, setLogoUploading] = useState(false)
  const [faviconUploading, setFaviconUploading] = useState(false)
  const [clientLinkEnabled, setClientLinkEnabled] = useState(false)
  const [customDomain, setCustomDomain] = useState('')
  const [domainValidated, setDomainValidated] = useState(false)
  const logoRef = useRef<HTMLInputElement>(null)
  const faviconRef = useRef<HTMLInputElement>(null)

  const { data: studio, isLoading } = useQuery({
    queryKey: ['studio', 'default'],
    queryFn: () => getStudio('default'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData & { favicon_url?: string | null; client_link_branding?: { enabled: boolean; customDomain: string; domainValidated?: boolean } }) =>
      updateStudio('default', {
        name: data.studioName,
        brand_color: data.brandColor,
        ...(data.favicon_url !== undefined && { favicon_url: data.favicon_url }),
        ...(data.client_link_branding !== undefined && {
          client_link_branding: data.client_link_branding as {
            enabled: boolean
            customDomain: string
            domainValidated?: boolean
          },
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio', 'default'] })
      toast.success('Branding saved')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    values: studio
      ? {
          studioName: studio.name,
          brandColor: studio.brand_color ?? '#0052CC',
        }
      : undefined,
  })

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      toast.error('Use JPEG, PNG, WebP, or SVG')
      return
    }
    if (file.size > MAX_LOGO_SIZE) {
      toast.error('Logo must be under 2MB')
      return
    }
    setLogoUploading(true)
    try {
      const { url } = await uploadLogo(file)
      await updateStudio('default', { logo_url: url })
      queryClient.invalidateQueries({ queryKey: ['studio', 'default'] })
      toast.success('Logo uploaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLogoUploading(false)
      if (logoRef.current) logoRef.current.value = ''
    }
  }

  const handleFaviconSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      toast.error('Use JPEG, PNG, WebP, or SVG')
      return
    }
    if (file.size > MAX_LOGO_SIZE) {
      toast.error('Favicon must be under 2MB')
      return
    }
    setFaviconUploading(true)
    try {
      const { url } = await uploadLogo(file)
      await updateStudio('default', { favicon_url: url })
      queryClient.invalidateQueries({ queryKey: ['studio', 'default'] })
      toast.success('Favicon uploaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setFaviconUploading(false)
      if (faviconRef.current) faviconRef.current.value = ''
    }
  }

  const handleValidateDomain = () => {
    const domain = customDomain.trim().replace(/^https?:\/\//, '')
    if (!domain) {
      toast.error('Enter a domain')
      return
    }
    const hostnameRe = /^[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z0-9][a-zA-Z0-9-]*)*\.[a-zA-Z]{2,}$/
    if (!hostnameRe.test(domain)) {
      toast.error('Invalid domain format')
      return
    }
    setDomainValidated(true)
    toast.success('Domain format validated')
  }

  const onSubmit = form.handleSubmit((data) => {
    updateMutation.mutate({
      ...data,
      client_link_branding: {
        enabled: clientLinkEnabled,
        customDomain: customDomain.trim(),
        domainValidated,
      },
    })
  })

  const clb = studio?.client_link_branding as { enabled?: boolean; customDomain?: string; domainValidated?: boolean } | null
  useEffect(() => {
    if (studio && clb) {
      if (clb.enabled) setClientLinkEnabled(true)
      if (clb.customDomain) setCustomDomain(clb.customDomain)
      if (clb.domainValidated) setDomainValidated(true)
    }
  }, [studio?.id, clb?.enabled, clb?.customDomain, clb?.domainValidated])

  if (isLoading || !studio) {
    return (
      <Card className="card-hover">
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>Customize how your studio appears</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-32 animate-pulse rounded-lg bg-muted" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-8">
        <Card className="card-hover">
          <CardHeader>
            <CardTitle>Branding</CardTitle>
            <CardDescription>
              Customize how your studio appears on invoices and to clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="studio-name">Studio name</Label>
                <Input
                  id="studio-name"
                  {...form.register('studioName')}
                  placeholder="Acme Design Studio"
                />
                {form.formState.errors.studioName && (
                  <p className="text-sm text-destructive">{form.formState.errors.studioName.message}</p>
                )}
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <div className="flex items-center gap-4">
                    <div className="flex h-20 w-32 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30">
                      {studio.logo_url ? (
                        <img
                          src={studio.logo_url}
                          alt="Studio logo"
                          className="h-full w-full object-contain p-2"
                        />
                      ) : (
                        <ImageIcon className="h-10 w-10 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <input
                        ref={logoRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={handleLogoSelect}
                        disabled={logoUploading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => logoRef.current?.click()}
                        disabled={logoUploading}
                      >
                        {logoUploading ? 'Uploading...' : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload logo
                          </>
                        )}
                      </Button>
                      <p className="mt-1 text-xs text-muted-foreground">PNG, SVG · Max 2MB</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Favicon</Label>
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30">
                      {studio.favicon_url ? (
                        <img
                          src={studio.favicon_url}
                          alt="Favicon"
                          className="h-8 w-8 object-contain"
                        />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <input
                        ref={faviconRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={handleFaviconSelect}
                        disabled={faviconUploading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => faviconRef.current?.click()}
                        disabled={faviconUploading}
                      >
                        {faviconUploading ? 'Uploading...' : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload favicon
                          </>
                        )}
                      </Button>
                      <p className="mt-1 text-xs text-muted-foreground">PNG, SVG · Max 2MB</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand-color">Brand color (primary)</Label>
                <div className="flex gap-2">
                  <input
                    id="brand-color"
                    type="color"
                    value={form.watch('brandColor')}
                    onChange={(e) => form.setValue('brandColor', e.target.value)}
                    className="h-10 w-16 cursor-pointer rounded-lg border border-input p-1"
                  />
                  <Input
                    {...form.register('brandColor')}
                    placeholder="#0052CC"
                    className="flex-1 font-mono"
                  />
                </div>
                {form.formState.errors.brandColor && (
                  <p className="text-sm text-destructive">{form.formState.errors.brandColor.message}</p>
                )}
              </div>

              <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Client link branding</p>
                    <p className="text-sm text-muted-foreground">
                      White-label client-facing approval links with your logo and colors
                    </p>
                  </div>
                  <Switch
                    checked={clientLinkEnabled}
                    onCheckedChange={setClientLinkEnabled}
                    aria-label="Enable client link branding"
                  />
                </div>
                {clientLinkEnabled && (
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="custom-domain">Custom domain (optional)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="custom-domain"
                        placeholder="approvals.yourstudio.com"
                        value={customDomain}
                        onChange={(e) => {
                          setCustomDomain(e.target.value)
                          setDomainValidated(false)
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleValidateDomain}
                      >
                        Validate
                      </Button>
                    </div>
                    {domainValidated && (
                      <p className="text-sm text-success">Domain format validated</p>
                    )}
                  </div>
                )}
              </div>

              <Button type="submit" disabled={updateMutation.isPending} className="btn-hover">
                Save branding
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-4">
        <ClientLinksPreview
          studioName={studio.name}
          logoUrl={studio.logo_url}
          primaryColor={form.watch('brandColor')}
          customDomain={customDomain.trim() || undefined}
          enabled={clientLinkEnabled}
        />
      </div>
    </div>
  )
}
