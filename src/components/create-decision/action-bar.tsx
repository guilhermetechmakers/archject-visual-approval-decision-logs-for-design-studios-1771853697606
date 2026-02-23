import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ValidationSummary } from './validation-summary'
import type { ValidationError } from './validation-summary'

export interface ActionBarProps {
  step: number
  totalSteps: number
  onBack: () => void
  onSaveDraft: () => void
  onPublish: () => void
  onCancel: () => void
  isSavingDraft: boolean
  isPublishing: boolean
  canPublish: boolean
  validationErrors: ValidationError[]
}

export function ActionBar({
  step,
  totalSteps,
  onBack,
  onSaveDraft,
  onPublish,
  onCancel,
  isSavingDraft,
  isPublishing,
  canPublish,
  validationErrors,
}: ActionBarProps) {
  return (
    <div className="sticky bottom-0 border-t border-border bg-card px-4 py-4 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-4">
        {validationErrors.length > 0 && (
          <ValidationSummary errors={validationErrors} />
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={onBack} disabled={isSavingDraft || isPublishing}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            <Button variant="ghost" onClick={onCancel} disabled={isSavingDraft || isPublishing}>
              Cancel
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onSaveDraft}
              isLoading={isSavingDraft}
              disabled={isPublishing}
            >
              Save draft
            </Button>
            {step === totalSteps && (
              <Button
                onClick={onPublish}
                isLoading={isPublishing}
                disabled={!canPublish || isSavingDraft}
              >
                Publish
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
