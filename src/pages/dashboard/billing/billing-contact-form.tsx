import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useBillingSummary, useUpdateBillingContact } from '@/hooks/use-billing'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email required'),
  companyName: z.string().optional(),
  line1: z.string().min(1, 'Address line 1 is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
})

type FormData = z.infer<typeof schema>

const defaultValues: FormData = {
  name: '',
  email: '',
  companyName: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'US',
}

export function BillingContactForm() {
  const { data } = useBillingSummary()
  const updateContact = useUpdateBillingContact()
  const contact = data?.billingContact

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  useEffect(() => {
    if (contact) {
      form.reset({
        name: contact.name ?? '',
        email: contact.email ?? '',
        companyName: contact.companyName ?? '',
        line1: contact.address?.line1 ?? '',
        line2: contact.address?.line2 ?? '',
        city: contact.address?.city ?? '',
        state: contact.address?.state ?? '',
        postalCode: contact.address?.postalCode ?? '',
        country: contact.address?.country ?? 'US',
      })
    }
  }, [contact, form])

  const onSubmit = form.handleSubmit((values) => {
    updateContact.mutate(
      {
        name: values.name,
        email: values.email,
        companyName: values.companyName,
        address: {
          line1: values.line1,
          line2: values.line2,
          city: values.city,
          state: values.state,
          postalCode: values.postalCode,
          country: values.country,
        },
      },
      { onSuccess: () => form.reset(values) }
    )
  })

  const canManage = data?.canManageBilling ?? true

  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          Billing contact & address
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Used to populate invoices and receipts
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="billing-name">Name</Label>
              <Input
                id="billing-name"
                {...form.register('name')}
                disabled={!canManage}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing-email">Billing email</Label>
              <Input
                id="billing-email"
                type="email"
                {...form.register('email')}
                disabled={!canManage}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing-company">Company name</Label>
            <Input
              id="billing-company"
              {...form.register('companyName')}
              disabled={!canManage}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing-line1">Address line 1</Label>
            <Input
              id="billing-line1"
              {...form.register('line1')}
              disabled={!canManage}
            />
            {form.formState.errors.line1 && (
              <p className="text-sm text-destructive">
                {form.formState.errors.line1.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing-line2">Address line 2</Label>
            <Input
              id="billing-line2"
              {...form.register('line2')}
              disabled={!canManage}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="billing-city">City</Label>
              <Input
                id="billing-city"
                {...form.register('city')}
                disabled={!canManage}
              />
              {form.formState.errors.city && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.city.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing-state">State / Province</Label>
              <Input
                id="billing-state"
                {...form.register('state')}
                disabled={!canManage}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing-postal">Postal code</Label>
              <Input
                id="billing-postal"
                {...form.register('postalCode')}
                disabled={!canManage}
              />
              {form.formState.errors.postalCode && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.postalCode.message}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing-country">Country</Label>
            <Input
              id="billing-country"
              {...form.register('country')}
              disabled={!canManage}
            />
            {form.formState.errors.country && (
              <p className="text-sm text-destructive">
                {form.formState.errors.country.message}
              </p>
            )}
          </div>
          {canManage && (
            <Button type="submit" disabled={updateContact.isPending}>
              Save
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
