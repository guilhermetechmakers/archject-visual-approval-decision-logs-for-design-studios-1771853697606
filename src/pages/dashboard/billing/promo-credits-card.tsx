import { useState } from 'react'
import { Tag } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useBillingSummary, useApplyPromo } from '@/hooks/use-billing'

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

export function PromoCreditsCard() {
  const [code, setCode] = useState('')
  const { data } = useBillingSummary()
  const applyPromo = useApplyPromo()

  const creditBalance = data?.creditBalanceCents ?? 0
  const canManage = data?.canManageBilling ?? true

  const handleApply = () => {
    const trimmed = code.trim()
    if (!trimmed) return
    applyPromo.mutate(trimmed, {
      onSuccess: () => setCode(''),
    })
  }

  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-muted-foreground" />
          Promo codes & credits
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Apply promo codes and view your credit balance
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-sm font-medium">Credit balance</p>
          <p className="text-2xl font-bold text-primary">
            {formatCurrency(creditBalance)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {creditBalance > 0
              ? 'Credits will be applied to your next invoice'
              : 'Apply a promo code to add credits'}
          </p>
        </div>

        {canManage && (
          <div className="flex gap-2">
            <Input
              placeholder="Enter promo code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApply()}
              className="flex-1"
              aria-label="Promo code"
            />
            <Button
              onClick={handleApply}
              disabled={!code.trim() || applyPromo.isPending}
            >
              Apply
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
