import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CreditCard,
  FileText,
  ArrowUpCircle,
  Download,
  ExternalLink,
  CheckCircle,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  useBillingSummary,
  useInvoices,
  usePaymentMethods,
  useSubscription,
} from '@/hooks/use-billing'
import { billingApi } from '@/api/billing'
import { PLANS } from '@/types/billing'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const STUDIO_ID = 'default'

function TrialStatusBadge({ trialEndsAt }: { trialEndsAt: string | null }) {
  if (!trialEndsAt) return null
  const end = new Date(trialEndsAt)
  const now = new Date()
  const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return (
    <Badge variant={daysLeft <= 7 ? 'warning' : 'secondary'} className="gap-1">
      Trial ends {end.toLocaleDateString()} ({daysLeft} days left)
    </Badge>
  )
}

export function SubscriptionsPage() {
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)

  const { data: summary, isLoading: summaryLoading } = useBillingSummary()
  const { data: subscription } = useSubscription()
  const { data: invoicesData, isLoading: invoicesLoading } = useInvoices({ perPage: 10 })
  const { data: paymentMethods, isLoading: pmLoading } = usePaymentMethods()

  const sub = summary?.subscription ?? subscription
  const invoices = invoicesData?.invoices ?? []
  const paymentMethodList = paymentMethods ?? []

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      await billingApi.downloadInvoicePdf(STUDIO_ID, invoiceId)
    } catch {
      // Toast handled by caller if needed
    }
  }

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your plan, invoices, and payment methods
        </p>
      </div>

      {/* Plan overview */}
      <Card className="card-hover">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current plan
            </CardTitle>
            <CardDescription>
              Your subscription and usage
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {sub?.trialEndsAt && <TrialStatusBadge trialEndsAt={sub.trialEndsAt} />}
            <Button onClick={() => setUpgradeOpen(true)} size="sm" className="btn-hover">
              <ArrowUpCircle className="mr-2 h-4 w-4" />
              Upgrade
            </Button>
            <Link to="/dashboard/billing">
              <Button variant="outline" size="sm">
                Manage billing
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {summaryLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="mt-1 font-semibold">{sub?.planName ?? 'Free'}</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm text-muted-foreground">Seats</p>
                <p className="mt-1 font-semibold">
                  {sub ? `${sub.seatsUsed} / ${sub.seats}` : '2 / 2'}
                </p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="mt-1">
                  <Badge variant={sub?.status === 'active' ? 'success' : 'secondary'}>
                    {sub?.status ?? 'active'}
                  </Badge>
                </p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm text-muted-foreground">Next billing</p>
                <p className="mt-1 font-medium">
                  {sub?.nextBillingDate
                    ? new Date(sub.nextBillingDate).toLocaleDateString()
                    : '—'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoices
          </CardTitle>
          <CardDescription>
            Download past invoices (CSV/PDF)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <p className="mt-2 font-medium">No invoices yet</p>
              <p className="text-sm text-muted-foreground">
                Invoices will appear here once you have billing activity
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="p-4 text-left font-medium">Date</th>
                    <th className="p-4 text-left font-medium">Amount</th>
                    <th className="p-4 text-left font-medium">Status</th>
                    <th className="p-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-4">{new Date(inv.issuedAt).toLocaleDateString()}</td>
                      <td className="p-4">
                        ${(inv.amountDueCents / 100).toFixed(2)} {inv.currency}
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
                      <td className="p-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadInvoice(inv.id)}
                        >
                          <Download className="mr-1 h-4 w-4" />
                          PDF
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment methods */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment methods
          </CardTitle>
          <CardDescription>
            Add or manage payment methods
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pmLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : paymentMethodList.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 text-center">
              <CreditCard className="h-10 w-10 text-muted-foreground" />
              <p className="mt-2 font-medium">No payment methods</p>
              <p className="text-sm text-muted-foreground">
                Add a card on the Billing page to manage payments
              </p>
              <Link to="/dashboard/billing">
                <Button className="mt-4" size="sm">
                  Go to Billing
                </Button>
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {paymentMethodList.map((pm) => (
                <li
                  key={pm.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium capitalize">{pm.brand} •••• {pm.last4}</p>
                      <p className="text-xs text-muted-foreground">
                        Expires {pm.expMonth}/{pm.expYear}
                      </p>
                    </div>
                    {pm.isDefault && (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Default
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Upgrade modal */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upgrade plan</DialogTitle>
            <DialogDescription>
              Choose a plan that fits your studio. You can change or cancel anytime.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {PLANS.filter((p) => p.id !== 'free').map((plan) => (
              <button
                type="button"
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={cn(
                  'flex items-center justify-between rounded-lg border p-4 text-left transition-colors',
                  selectedPlanId === plan.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                )}
              >
                <div>
                  <p className="font-semibold">{plan.name}</p>
                  <p className="text-sm text-muted-foreground">
                    ${(plan.monthlyPriceCents / 100).toFixed(0)}/mo · Up to {plan.maxSeats} seats
                  </p>
                </div>
                {selectedPlanId === plan.id && (
                  <CheckCircle className="h-5 w-5 text-primary" />
                )}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeOpen(false)}>
              Cancel
            </Button>
            <Link to="/dashboard/billing">
              <Button disabled={!selectedPlanId}>
                Continue to checkout
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
