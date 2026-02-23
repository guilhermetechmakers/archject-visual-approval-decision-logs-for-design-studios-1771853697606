import { CreditCard, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useBillingSummary, usePaymentMethods, useSetDefaultPaymentMethod } from '@/hooks/use-billing'
import { cn } from '@/lib/utils'
import type { PaymentMethod } from '@/types/billing'

function CardBrandIcon({ brand }: { brand: string }) {
  const name = brand.toLowerCase()
  return (
    <div
      className={cn(
        'flex h-8 w-12 items-center justify-center rounded border border-border bg-muted text-xs font-medium',
        name.includes('visa') && 'bg-blue-50 text-blue-700',
        name.includes('master') && 'bg-orange-50 text-orange-700'
      )}
    >
      {name.includes('visa') ? 'Visa' : name.includes('master') ? 'MC' : brand.slice(0, 2)}
    </div>
  )
}

function PaymentMethodRow({
  pm,
  onRemove,
  canManage,
}: {
  pm: PaymentMethod
  onRemove: (pm: PaymentMethod) => void
  canManage: boolean
}) {
  const setDefault = useSetDefaultPaymentMethod()

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border border-border p-4 transition-colors',
        'hover:bg-muted/50'
      )}
    >
      <div className="flex items-center gap-3">
        <CardBrandIcon brand={pm.brand} />
        <div>
          <p className="font-medium">
            {pm.brand} •••• {pm.last4}
          </p>
          <p className="text-sm text-muted-foreground">
            Expires {String(pm.expMonth).padStart(2, '0')}/{pm.expYear}
          </p>
        </div>
        {pm.isDefault && (
          <Badge variant="secondary" className="ml-2">Default</Badge>
        )}
      </div>
      {canManage && (
        <div className="flex items-center gap-2">
          {!pm.isDefault && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDefault.mutate(pm.id)}
              disabled={setDefault.isPending}
            >
              Set default
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onRemove(pm)}
          >
            Remove
          </Button>
        </div>
      )}
    </div>
  )
}

export function PaymentMethodsList() {
  const { data: summary } = useBillingSummary()
  const { data: methods = [], isLoading } = usePaymentMethods()
  const canManage = summary?.canManageBilling ?? true

  return (
    <Card className="card-hover">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            Payment methods
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Manage cards on file for subscription payments
          </p>
        </div>
        {canManage && (
          <Button
            size="sm"
            onClick={() => {
              const event = new CustomEvent('billing:add-payment-method')
              window.dispatchEvent(event)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add payment method
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : methods.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 font-medium">No payment methods</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a card to upgrade your plan or pay invoices
            </p>
            {canManage && (
              <Button
                className="mt-4"
                onClick={() => {
                  const event = new CustomEvent('billing:add-payment-method')
                  window.dispatchEvent(event)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add payment method
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {methods.map((pm) => (
              <PaymentMethodRow
                key={pm.id}
                pm={pm}
                onRemove={(paymentMethod) => {
                  const event = new CustomEvent('billing:remove-payment-method', { detail: paymentMethod })
                  window.dispatchEvent(event)
                }}
                canManage={canManage}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
