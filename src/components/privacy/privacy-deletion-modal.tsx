import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { useCreateDeletion } from '@/hooks/use-privacy'

interface PrivacyDeletionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CONSEQUENCES = [
  'All projects, decisions, and approvals will be permanently deleted.',
  'Client links and share tokens will stop working.',
  'You will lose access to exported Decision Logs stored in your account.',
  'You can cancel within 14 days before deletion is finalized.',
]

export function PrivacyDeletionModal({ open, onOpenChange }: PrivacyDeletionModalProps) {
  const [password, setPassword] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const createDeletion = useCreateDeletion()

  const handleSubmit = () => {
    if (!password || !confirmed) return
    createDeletion.mutate(
      { password },
      {
        onSuccess: () => {
          onOpenChange(false)
          setPassword('')
          setConfirmed(false)
        },
      }
    )
  }

  const isValid = password.length > 0 && confirmed

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        className="max-w-lg"
        aria-labelledby="deletion-modal-title"
        aria-describedby="deletion-modal-desc"
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle id="deletion-modal-title">Request Account Deletion</DialogTitle>
              <DialogDescription id="deletion-modal-desc">
                This action will schedule permanent deletion of your account and all associated data.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <h3 className="text-sm font-medium mb-2">What happens when you delete your account</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {CONSEQUENCES.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-destructive">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label htmlFor="deletion-password" className="block text-sm font-medium mb-2">
              Re-enter your password to confirm
            </label>
            <Input
              id="deletion-password"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full"
              aria-required
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={confirmed}
              onCheckedChange={(c) => setConfirmed(!!c)}
              aria-label="I understand this action is irreversible after the hold window"
            />
            <span className="text-sm text-muted-foreground">
              I understand that my account and data will be permanently deleted after the 14-day hold window, and I cannot recover them.
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!isValid || createDeletion.isPending}
          >
            {createDeletion.isPending ? 'Requesting...' : 'Request Deletion'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
