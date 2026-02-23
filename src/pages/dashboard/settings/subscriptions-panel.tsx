import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  CreditCard,
  FileText,
  ArrowRight,
  Check,
  Download,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { getSubscription, getInvoices, getPaymentMethods } from '@/api/settings'
import { useBillingSummary } from '@/hooks/use-billing'
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: 'default' | 'secondary' | 'success' | 'warning'; label: string }> = {
    active: { variant: 'success', label: 'Active' },
    trialing: { variant: 'secondary', label: 'Trial' },
    past_due: { variant: 'warning', label: 'Past due' },
    canceled: { variant: 'secondary', label: 'Canceled' },
  }
  const { variant, label } = config[status] ?? config.active
  return <Badge variant={variant}>{label}</Badge>
}

export function SubscriptionsPanel() {
  const { data: billingSummary } = useBillingSummary()
  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ['settings', 'subscription', 'default'],
    queryFn: () => getSubscription('default'),
  })
  const { data: invoices, isLoading: invLoading } = useQuery({
    queryKey: ['settings', 'invoices', 'default'],
    queryFn: () => getInvoices('default'),
  })
  const { data: paymentMethods } = useQuery({
    queryKey: ['settings', 'payment-methods', 'default'],
    queryFn: () => getPaymentMethods('default'),
  })

  const planName = subscription?.planName ?? billingSummary?.subscription?.planName ?? 'Professional'
  const seatsUsed = subscription?.seatsUsed ?? billingSummary?.subscription?.seatsUsed ?? 0
  const seats = subscription?.seats ?? billingSummary?.subscription?.seats ?? 10
  const nextBilling = subscription?.nextBillingDate
  const trialEnd = subscription?.trialEnd
  const status = subscription?.status ?? 'active'

  return (
    <div className="space-y-6">
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            Plan overview
          </CardTitle>
          <CardDescription>
            Current plan, usage, and renewal details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold">{planName}</p>
                    <StatusBadge status={status} />
                    {trialEnd && (
                      <Badge variant="warning">Trial ends {new Date(trialEnd).toLocaleDateString()}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {seatsUsed} of {seats} seats used
                  </p>
                </div>
                {nextBilling && (
                  <p className="text-sm text-muted-foreground">
                    Renews {new Date(nextBilling).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Link to="/dashboard/billing">
                <Button variant="outline" size="sm" className="gap-2 transition-transform duration-200 hover:scale-[1.02]">
                  Manage billing
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Invoices
          </CardTitle>
          <CardDescription>
            View and download past invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : invoices && invoices.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left font-medium p-4">Date</th>
                    <th className="text-left font-medium p-4">Amount</th>
                    <th className="text-left font-medium p-4">Status</th>
                    <th className="w-24 p-4" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-4">{new Date(inv.date).toLocaleDateString()}</td>
                      <td className="p-4">
                        {inv.currency} {inv.amount.toFixed(2)}
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={
                            inv.status === 'paid'
                              ? 'success'
                              : inv.status === 'failed'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {inv.status === 'paid' && inv.downloadUrl && (
                          <a
                            href={inv.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <Download className="h-4 w-4" />
                            Export
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">No invoices yet</p>
              <Link to="/dashboard/billing">
                <Button variant="outline" size="sm" className="mt-4">
                  Go to Billing
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            Payment methods
          </CardTitle>
          <CardDescription>
            Manage payment methods for your subscription
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentMethods && paymentMethods.length > 0 ? (
            <div className="space-y-3">
              {paymentMethods.map((pm) => (
                <div
                  key={pm.id}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {pm.brand ?? 'Card'} •••• {pm.last4}
                      </p>
                      {pm.expiryMonth && pm.expiryYear && (
                        <p className="text-xs text-muted-foreground">
                          Expires {pm.expiryMonth}/{pm.expiryYear}
                        </p>
                      )}
                    </div>
                  </div>
                  {pm.isDefault && (
                    <Badge variant="success" className="gap-1">
                      <Check className="h-3 w-3" />
                      Default
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <CreditCard className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">No payment methods on file</p>
              <Link to="/dashboard/billing">
                <Button variant="outline" size="sm" className="mt-4">
                  Add payment method
                </Button>
              </Link>
            </div>
          )}
          <Link to="/dashboard/billing" className="mt-4 inline-block">
            <Button variant="outline" size="sm">
              Manage in Billing
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
