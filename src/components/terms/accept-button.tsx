import { Button } from '@/components/ui/button'
import { useAcceptTerms } from '@/hooks/use-terms'

interface AcceptButtonProps {
  versionId: string
  userId?: string
  signupId?: string
  className?: string
  children?: React.ReactNode
}

export function AcceptButton({ versionId, userId, signupId, className, children }: AcceptButtonProps) {
  const acceptMutation = useAcceptTerms()

  const handleAccept = () => {
    acceptMutation.mutate({ versionId, userId, signupId })
  }

  return (
    <Button
      onClick={handleAccept}
      disabled={acceptMutation.isPending}
      className={className}
      style={{ backgroundColor: '#0052CC' }}
    >
      {acceptMutation.isPending ? 'Recording...' : children ?? 'I accept'}
    </Button>
  )
}
