import { useState } from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useCreateDeletion } from '@/hooks/use-privacy'
import { cn } from '@/lib/utils'

const CONSEQUENCES = [
  'All projects, decisions, and approvals will be permanently deleted.',
  'Client links and share tokens will stop working.',
  'You will lose access to exported Decision Logs stored in your account.',
  'You can cancel within 14 days before deletion is finalized.',
]

interface AccountDeletionPanelProps {
  email: string
}

export function AccountDeletionPanel({ email }: AccountDeletionPanelProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const createDeletion = useCreateDeletion()

  const isValid = password.length > 0 && confirmEmail.toLowerCase() === email.toLowerCase() && confirmed

  const handleSubmit = () => {
    if (!isValid) return
    createDeletion.mutate(
      { password },
      {
        onSuccess: () => {
          setModalOpen(false)
          setPassword('')
          setConfirmEmail('')
          setConfirmed(false)
        },
      }
    )
  }

  return (
    <>
      <Card className="card-hover border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete account
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data. This action cannot be undone after the 14-day hold window.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm text-muted-foreground">
            {CONSEQUENCES.map((item, i) => (
              <li key={i} className="flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
          <Button
            variant="outline"
            className="border-destructive text-destructive hover:bg-destructive/10"
            onClick={() => setModalOpen(true)}
          >
            Start deletion process
          </Button>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent
          onClose={() => setModalOpen(false)}
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
                  Re-enter your password and type your email to confirm. Your account will be scheduled for deletion.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div>
              <Label htmlFor="deletion-password">Re-enter your password</Label>
              <Input
                id="deletion-password"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="deletion-email">
                Type your email to confirm: <span className="font-mono text-muted-foreground">{email}</span>
              </Label>
              <Input
                id="deletion-email"
                type="email"
                placeholder="Type your email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className={cn('mt-2', confirmEmail && confirmEmail.toLowerCase() !== email.toLowerCase() && 'border-destructive')}
              />
              {confirmEmail && confirmEmail.toLowerCase() !== email.toLowerCase() && (
                <p className="mt-1 text-sm text-destructive">Email must match your account email</p>
              )}
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1 rounded border-input"
              />
              <span className="text-sm text-muted-foreground">
                I understand that my account and data will be permanently deleted after the 14-day hold window, and I cannot recover them.
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
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
    </>
  )
}
