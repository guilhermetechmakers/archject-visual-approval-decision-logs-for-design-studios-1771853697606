import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const schema = z.object({
  studioName: z.string().min(1, 'Studio name is required'),
  logoUrl: z.string().optional(),
  invoiceAccentColor: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function BrandingPanel() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      studioName: 'Acme Design Studio',
      logoUrl: '',
      invoiceAccentColor: '#0052CC',
    },
  })

  const onSubmit = form.handleSubmit((data) => {
    toast.success('Branding saved')
    form.reset(data)
  })

  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle>Branding</CardTitle>
        <CardDescription>
          Customize how your studio appears on invoices and to clients
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="studio-name">Studio name</Label>
            <Input
              id="studio-name"
              {...form.register('studioName')}
              placeholder="Acme Design Studio"
            />
            {form.formState.errors.studioName && (
              <p className="text-sm text-destructive">
                {form.formState.errors.studioName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="logo-url">Logo URL</Label>
            <Input
              id="logo-url"
              {...form.register('logoUrl')}
              placeholder="https://example.com/logo.png"
            />
            {form.formState.errors.logoUrl && (
              <p className="text-sm text-destructive">
                {form.formState.errors.logoUrl.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Logo appears on invoice PDFs and email templates
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="accent-color">Invoice accent color</Label>
            <Input
              id="accent-color"
              {...form.register('invoiceAccentColor')}
              className="flex-1"
              placeholder="#0052CC"
            />
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium">Invoice preview</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your logo and accent color will appear on generated invoice PDFs
            </p>
          </div>
          <Button type="submit">Save branding</Button>
        </form>
      </CardContent>
    </Card>
  )
}
