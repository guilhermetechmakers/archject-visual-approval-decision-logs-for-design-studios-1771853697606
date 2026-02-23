import { useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { PortalDecision } from '@/types/portal'

export interface ApprovalBarProps {
  decision: PortalDecision
  onApprove: (optionId: string, approverName?: string) => void
  isLoading?: boolean
  requireNameConfirmation?: boolean
  className?: string
}

export function ApprovalBar({
  decision,
  onApprove,
  isLoading,
  requireNameConfirmation = false,
  className,
}: ApprovalBarProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [approverName, setApproverName] = useState('')

  const isApproved = decision.status === 'approved'
  const approvedOption = decision.options.find(
    (o) => o.id === decision.approvedOptionId || o.selected
  )

  const handleApprove = () => {
    if (!selectedOptionId) return
    if (requireNameConfirmation && !approverName.trim()) return
    onApprove(selectedOptionId, approverName.trim() || undefined)
  }

  if (isApproved) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border border-[rgb(16,185,129)]/30 bg-[rgb(16,185,129)]/5 px-4 py-3',
          className
        )}
      >
        <Check className="h-5 w-5 text-[rgb(16,185,129)]" aria-hidden />
        <div>
          <p className="font-medium text-[rgb(17,24,39)]">Approved</p>
          {approvedOption && (
            <p className="text-sm text-[rgb(107,114,128)]">
              {approvedOption.label}
              {decision.approvedByName && ` by ${decision.approvedByName}`}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-[rgb(17,24,39)]">
          Select your choice
        </Label>
        <div className="flex flex-wrap gap-2">
          {decision.options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelectedOptionId(opt.id)}
              className={cn(
                'inline-flex min-h-[44px] items-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all',
                selectedOptionId === opt.id
                  ? 'border-[rgb(0,82,204)] bg-[rgb(0,82,204)]/5 text-[rgb(0,82,204)]'
                  : 'border-[rgb(229,231,235)] bg-[#FFFFFF] text-[rgb(17,24,39)] hover:border-[rgb(0,82,204)]/50'
              )}
              aria-pressed={selectedOptionId === opt.id}
            >
              {selectedOptionId === opt.id && (
                <Check className="h-4 w-4" aria-hidden />
              )}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {requireNameConfirmation && (
        <div className="space-y-2">
          <Label htmlFor="approver-name" className="text-sm font-medium">
            Type your name to confirm
          </Label>
          <Input
            id="approver-name"
            type="text"
            placeholder="Your name"
            value={approverName}
            onChange={(e) => setApproverName(e.target.value)}
            className="rounded-lg border-[rgb(209,213,219)]"
          />
        </div>
      )}

      <Button
        onClick={handleApprove}
        disabled={!selectedOptionId || isLoading || (requireNameConfirmation && !approverName.trim())}
        className="bg-[rgb(0,82,204)] text-white hover:bg-[rgb(0,82,204)]/90"
      >
        {isLoading ? 'Submitting…' : 'Approve selection'}
      </Button>
    </div>
  )
}
