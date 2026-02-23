import { useState } from 'react'
import {
  FileText,
  Download,
  Mail,
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useInvoices } from '@/hooks/use-billing'
import { cn } from '@/lib/utils'
import type { Invoice, InvoiceStatus } from '@/types/billing'

function formatCurrency(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const config: Record<InvoiceStatus, { variant: 'success' | 'warning' | 'destructive' | 'secondary' }> = {
    paid: { variant: 'success' },
    open: { variant: 'warning' },
    failed: { variant: 'destructive' },
    draft: { variant: 'secondary' },
    void: { variant: 'secondary' },
  }
  const { variant } = config[status] ?? config.draft
  return <Badge variant={variant}>{status}</Badge>
}

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

function InvoiceRow({
  invoice,
  onViewDetails,
  onResend,
}: {
  invoice: Invoice
  onViewDetails: (inv: Invoice) => void
  onResend: (inv: Invoice) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const pdfUrl = `${API_BASE}/studios/default/invoices/${invoice.id}/pdf`
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null
  const pdfUrlWithAuth = token ? `${pdfUrl}?token=${encodeURIComponent(token)}` : pdfUrl

  return (
    <div
      className={cn(
        'border-b border-border last:border-0 transition-colors',
        'hover:bg-muted/50'
      )}
    >
      <div
        className="flex flex-col gap-2 py-4 px-4 sm:flex-row sm:items-center sm:justify-between"
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <p className="font-medium">{invoice.invoiceNumber}</p>
            <p className="text-sm text-muted-foreground">{formatDate(invoice.issuedAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="font-medium">{formatCurrency(invoice.amountDueCents, invoice.currency)}</span>
          <StatusBadge status={invoice.status} />
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <a
              href={pdfUrlWithAuth}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded p-2 hover:bg-muted"
              aria-label={`Download invoice ${invoice.invoiceNumber}`}
            >
              <Download className="h-4 w-4" />
            </a>
            {invoice.status === 'paid' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  onResend(invoice)
                }}
                aria-label={`Resend invoice ${invoice.invoiceNumber}`}
              >
                <Mail className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                onViewDetails(invoice)
              }}
              aria-label={`View details for ${invoice.invoiceNumber}`}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-0">
          <div className="rounded-lg bg-muted/50 p-4 text-sm">
            {invoice.lineItems?.length ? (
              <ul className="space-y-2">
                {invoice.lineItems.map((item, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{item.description} × {item.quantity}</span>
                    <span>{formatCurrency(item.unitAmountCents * item.quantity, invoice.currency)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No line items</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function InvoicesList() {
  const [search, setSearch] = useState('')
  const [year, setYear] = useState<number | ''>('')
  const { data, isLoading } = useInvoices({
    page: 1,
    perPage: 20,
    year: year || undefined,
  })

  const invoices = data?.invoices ?? []
  const filtered = search
    ? invoices.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(search.toLowerCase())
      )
    : invoices

  return (
    <Card className="card-hover">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Invoices & receipts</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Download PDFs and view invoice details
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by invoice #"
              className="pl-9 w-48"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search invoices"
            />
          </div>
          <select
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            value={year}
            onChange={(e) => setYear(e.target.value ? Number(e.target.value) : '')}
            aria-label="Filter by year"
          >
            <option value="">All years</option>
            {[2025, 2024, 2023].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 font-medium">No invoices yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Invoices will appear here once you have an active subscription
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {filtered.map((inv) => (
              <InvoiceRow
                key={inv.id}
                invoice={inv}
                onViewDetails={() => {
                  const event = new CustomEvent('billing:invoice-detail', { detail: inv })
                  window.dispatchEvent(event)
                }}
                onResend={() => {
                  const event = new CustomEvent('billing:resend-invoice', { detail: inv })
                  window.dispatchEvent(event)
                }}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
