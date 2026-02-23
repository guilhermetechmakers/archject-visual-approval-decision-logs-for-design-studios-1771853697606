import { useState, useRef } from 'react'
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
import { getStudio, updateStudio, uploadLogo } from '@/api/studios'

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
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: studio, isLoading } = useQuery({
    queryKey: ['studio', 'default'],
    queryFn: () => getStudio('default'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) =>
      updateStudio('default', {
        name: data.studioName,
        brand_color: data.brandColor,
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
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const onSubmit = form.handleSubmit((data) => {
    updateMutation.mutate(data)
  })

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
                  ref={inputRef}
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
                  onClick={() => inputRef.current?.click()}
                  disabled={logoUploading}
                >
                  {logoUploading ? 'Uploading...' : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload logo
                    </>
                  )}
                </Button>
                <p className="mt-1 text-xs text-muted-foreground">
                  JPEG, PNG, WebP, SVG · Max 2MB
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand-color">Brand color</Label>
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

          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium">Preview</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your logo and brand color appear on invoice PDFs and email templates
            </p>
          </div>

          <Button type="submit" disabled={updateMutation.isPending}>
            Save branding
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
