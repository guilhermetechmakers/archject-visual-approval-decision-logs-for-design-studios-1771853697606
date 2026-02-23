import { useNavigate, useSearchParams } from 'react-router-dom'
import { SuccessPageLayout } from '@/components/success'
import { SuccessCard } from '@/components/success'
import { toast } from 'sonner'

/**
 * Generic success/confirmation page for post-action flows (exports, approvals, etc.).
 * Supports query params: title, message, returnTo, action
 */
export function SuccessConfirmationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const title = searchParams.get('title') ?? 'Action completed'
  const message =
    searchParams.get('message') ??
    'Your action has been completed successfully.'
  const returnTo = searchParams.get('returnTo') ?? '/dashboard'
  const actionLabel = searchParams.get('action') ?? 'Back to dashboard'

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value)
    toast.success('Copied to clipboard')
  }

  return (
    <SuccessPageLayout>
      <SuccessCard
        title={title}
        message={message}
        iconType="success"
        primaryCTA={{
          label: actionLabel,
          action: () => navigate(returnTo),
        }}
        secondaryCTAs={[
          {
            label: 'View exports',
            action: () => navigate('/dashboard/exports'),
          },
        ]}
        onCopyReference={handleCopy}
      />
    </SuccessPageLayout>
  )
}
